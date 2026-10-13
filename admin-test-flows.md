# Checklist kiểm thử toàn bộ Admin Pawpal-er

Ngày rà soát mã: 13/10/2026. Phạm vi: `pages/admin/index.html`, 9 phân hệ trong `pages/admin/modules`, các điều khiển được tạo từ JavaScript. Đây là danh sách **cần kiểm thử**; ô chưa đánh dấu nghĩa là chưa xác nhận kết quả chạy trên giao diện. Dùng dữ liệu Supabase thật, tránh ghi dữ liệu thử vào hồ sơ thật ngoài phạm vi kiểm thử.

## Cách chạy mỗi luồng

- [ ] Mở tab bằng sidebar và header; tải lần đầu, F5, quay lại tab; kiểm tra URL hash và nội dung khớp, không có khoảng trắng sau khi skeleton biến mất.
- [ ] Với mỗi nút, liên kết và dòng bảng: bấm bằng chuột; kiểm tra đúng tác vụ, trạng thái bật/tắt, phản hồi thành công/lỗi và không gửi yêu cầu lặp khi bấm nhanh.
- [ ] Với mỗi ô nhập: thử trống, hợp lệ, sai định dạng, ký tự Unicode tiếng Việt, nội dung dài; kiểm tra thông báo, lưu/đọc lại Supabase và giữ dữ liệu khi API lỗi.
- [ ] Với mỗi ô chọn: mở danh sách, chọn từng nhánh nghiệp vụ, chọn lại mặc định, kiểm tra các trường phụ thuộc; với checkbox/radio thử cả bật và tắt.
- [ ] Với mỗi bảng: dữ liệu có/không có/lỗi API; tìm kiếm, từng bộ lọc và tổ hợp lọc, xóa lọc, sắp xếp nếu có, phân trang đầu/giữa/cuối, số dòng tối đa 10, cột không tràn.
- [ ] Với mỗi modal/drawer/menu: mở từ mọi điểm vào, đóng bằng nút Đóng/Hủy, nền tối, Escape; thử Lưu thành công/thất bại, không reload và không mở chồng modal.
- [ ] Với tác vụ ghi/xóa/khóa/hoàn tiền/gửi tin: kiểm tra xác nhận, quyền truy cập, thay đổi DB, cập nhật realtime và audit log. Kiểm thử bằng bản ghi dành riêng cho QA.
- [ ] Kiểm tra trên màn hình rộng/hẹp; nút, nhãn, popover, bảng và modal không che nhau; thao tác bàn phím và focus còn dùng được.

## Luồng theo phân hệ

### Khung Admin và Dashboard

- [ ] Đăng nhập → mở Admin → chuyển lần lượt 9 menu sidebar → thu/mở sidebar, mở menu trên màn hình nhỏ, về trang khách và đăng xuất.
- [ ] Dashboard: KPI và biểu đồ tải từ DB; chọn ngày/tuần trên lịch, mở lịch hẹn; bấm từng dòng lịch, tồn kho và liên kết chuyển phân hệ; mở/đóng modal thông tin ca dịch vụ và đi tới hồ sơ ca.

### Khách hàng

- [ ] Danh sách: tìm theo tên/SĐT; lọc hạng, trạng thái, khiếu nại; xóa lọc, xuất file, phân trang, mở hồ sơ và menu tác vụ từng khách.
- [ ] Thêm khách: nhập thông tin chủ nuôi, địa chỉ, bé cưng ban đầu; thử trường bắt buộc, trùng SĐT/email, lưu và kiểm tra bảng/DB.
- [ ] Hồ sơ: chuyển tab con trong hồ sơ, sửa thông tin, ghi chú, gửi lại SMS, thêm/sửa thú cưng, thao tác tài khoản và xác nhận; F5 giữ đúng hồ sơ.
- [ ] Pawpoint: tìm/lọc lịch sử, xuất file, cộng/trừ điểm bằng lý do và chip gợi ý, kiểm tra số dư và lịch sử sau lưu.

### Thú cưng

- [ ] Danh sách: tìm kiếm và lọc loài, giống, cân nặng, tiêm phòng, khách sạn; xuất file, phân trang, menu dòng.
- [ ] Thêm/sửa bé cưng: tìm/chọn chủ nuôi bằng autocomplete, tạo nhanh chủ nuôi và tự chọn lại, nhập dữ liệu sức khỏe, thêm ảnh, lưu và đọc lại.
- [ ] Hồ sơ: các tab/thẻ thông tin, chuyển qua chủ nuôi, cân nặng, vắc xin, ghi chú KTV, thẻ vòng cổ/in, ảnh; kiểm tra đóng và xác nhận từng modal.
- [ ] Nhật ký: tìm và phân trang **toàn bộ nhật ký**, mở chi tiết, ảnh và hồ sơ ca; trạng thái rỗng đúng khi DB không có dữ liệu.
- [ ] Nhắc lịch: tìm/lọc, chọn mẫu, sửa nội dung, sao chép, gửi một hoặc nhiều nhắc lịch, kiểm tra trạng thái gửi.

### Dịch vụ

- [ ] Lịch hẹn: tìm/lọc danh mục, trạng thái, thời gian, nhân viên và cảnh báo; xóa lọc, xuất file, phân trang, menu từng lịch hẹn.
- [ ] Tạo lịch: chọn khách → tự điền SĐT và bé cưng; chọn bé trước → tự điền chủ; chọn gói dịch vụ; kiểm tra trường riêng Grooming/Hotel/Taxi; chọn ngày/giờ/KTV; lưu và xử lý trùng lịch.
- [ ] Hồ sơ ca: xác nhận/huỷ, tiếp nhận an toàn, đổi KTV, sửa từng bước nhật ký và ảnh, dịch vụ đi kèm, phụ phí, SOP, phiếu tiếp nhận, chia sẻ nhật ký, thông báo đón, hoàn tất/thanh toán POS.
- [ ] Danh mục: tìm/lọc, thêm/sửa/kích hoạt/tạm ngừng gói dịch vụ và các trường giá/thời lượng/đối tượng.
- [ ] Đánh giá: tìm/lọc sao, dịch vụ, KTV, phản hồi; xuất file, xem nội dung dài không tràn cột, mở phản hồi, dùng mẫu/voucher, chuyển thành khiếu nại.

### Bán hàng

- [ ] Đơn hàng: tìm/lọc trạng thái, thanh toán, cảnh báo; xuất file, phân trang, menu dòng và mở chi tiết.
- [ ] Tạo đơn POS: chọn khách, địa chỉ giao/nhận tại quầy, thêm/bớt sản phẩm, số lượng, voucher, Pawpoint, giao hàng, thanh toán; in hoá đơn.
- [ ] Chi tiết đơn: xác nhận, đóng gói/in phiếu, giao hàng, vận đơn, huỷ, đổi trả/hoàn tiền, thao tác hàng loạt và bảng kê; kiểm tra chuyển trạng thái đúng.
- [ ] Sản phẩm/kho: tìm/lọc, thêm/sửa/ẩn hiện, ảnh và thuộc tính, nhập kho, kiểm kê, điều chỉnh tồn, nhật ký kho, đánh giá sản phẩm; kiểm tra số tồn sau từng thao tác.
- [ ] Khuyến mãi: tìm, tạo/sửa voucher, điều kiện giảm giá, thời hạn, số lượt, trạng thái, menu dòng; kiểm tra căn cột và dữ liệu sau reload.

### Nhân sự

- [ ] Danh sách: tìm/lọc vị trí, trạng thái, ca và cảnh báo; xuất file, thêm/sửa nhân viên, khoá/mở tài khoản, menu dòng.
- [ ] Hồ sơ: sửa nhân sự, phân ca, đánh giá, khoá an toàn và các liên kết hồ sơ liên quan.
- [ ] Lịch: chọn ngày bằng nút trước/sau/hôm nay hoặc ô ngày; chuyển xem ngày/tuần; phân ca, đổi ca/nghỉ phép, duyệt/từ chối, điều phối lại và báo cáo sự cố.
- [ ] Đánh giá: tìm/lọc loại và kết quả, tạo/sửa/đánh giá lại, gửi thông báo, kiểm tra điểm và hồ sơ sau lưu.

### Khiếu nại

- [ ] Theo dịch vụ và theo đơn hàng: tìm kiếm, bộ lọc nhanh và bộ lọc chi tiết, xóa lọc, xuất file, phân trang; số KPI khớp bản ghi trong DB.
- [ ] Tạo khiếu nại: tìm/chọn khách, tham chiếu lịch hẹn/đơn hàng, mức ưu tiên, nội dung, bằng chứng, lưu và mở hồ sơ mới.
- [ ] Hồ sơ: xem lịch sử/bằng chứng, tải thêm ảnh, phân công người xử lý, yêu cầu thêm thông tin, phương án đổi trả/hoàn tiền, xử lý xong và mở lại; kiểm tra cảnh báo SLA và cập nhật ở cả hai danh sách.

### Chatbot

- [ ] Hỗ trợ trực tiếp: lọc hội thoại khẩn/đang xử lý/tất cả, tìm; mở hội thoại, gửi văn bản/ảnh, dùng câu trả lời mẫu, theo dõi đơn và camera thú cưng; menu xử lý.
- [ ] Hội thoại: cộng Pawpoint, chuyển thành khiếu nại, chuyển quản lý, giải quyết và gửi khảo sát; xác nhận trạng thái, lịch sử và liên kết thực thể.
- [ ] Copilot: nhập câu hỏi, gửi, xoá hội thoại, đồng bộ tri thức; kiểm tra trạng thái chờ/lỗi và câu trả lời từ dữ liệu thật.
- [ ] Quy tắc: tìm/lọc FAQ, từ cấm, câu trả lời mẫu; thêm/sửa/bật tắt/xoá, ưu tiên, thay thế từ, xác nhận và tải lại.

### Cấu hình

- [ ] Banner và khuyến mãi: tìm/lọc voucher, thêm/sửa/xoá banner, voucher, quy tắc Pawpoint và thông báo; kiểm tra ngày áp dụng, liên kết và trạng thái.
- [ ] Nội dung: tìm/lọc bài viết, thêm/sửa/xoá/xuất bản, đồng bộ tri thức chatbot, kiểm tra nội dung dài và ảnh.
- [ ] Hệ thống: chế độ an toàn, thông tin cửa hàng, thanh toán, vận chuyển, chính sách đặt lịch và đối tác; thử xác nhận thay đổi có ảnh hưởng.
- [ ] Nhật ký thao tác: tìm/lọc phân hệ, phân trang, kiểm tra ai/lúc nào/hành động trước-sau tương ứng các thao tác ghi vừa thử.

## Danh mục điều khiển để đánh dấu từng nút, ô và lựa chọn

Mỗi dòng dưới đây là một điều khiển tìm thấy trong HTML hoặc mẫu HTML được tạo từ JavaScript. Khi chạy QA, đánh dấu từng dòng sau khi đã thử thao tác, trạng thái hợp lệ và lỗi. Các điều khiển chỉ xuất hiện có điều kiện cần tạo đúng dữ liệu/trạng thái để thấy chúng.

Đã quét **1.197 điều khiển HTML của Admin**, **7 điều khiển đăng nhập**, **2 vùng bấm bổ sung** và **206 vị trí tạo điều khiển trong JavaScript**. Số dòng nguồn giúp tìm đúng vị trí mã; nút phân trang và hàng bảng được tạo theo dữ liệu phải thử trên giao diện ở mỗi trạng thái.

### pages/admin/index.html — 13 điều khiển

#### Khung chung / ngoài tab — 13
- [ ] L36 · **button** · Thu gọn hoặc mở rộng menu · `btnToggleSidebar`
- [ ] L44 · **button** · Dashboard · `class=sidebar-menu-btn`
- [ ] L48 · **button** · Khách hàng · `class=sidebar-menu-btn`
- [ ] L52 · **button** · Thú cưng · `class=sidebar-menu-btn`
- [ ] L56 · **button** · Dịch vụ · `class=sidebar-menu-btn`
- [ ] L60 · **button** · Bán hàng · `class=sidebar-menu-btn.active`
- [ ] L64 · **button** · Nhân sự · `class=sidebar-menu-btn`
- [ ] L68 · **button** · Khiếu nại · `class=sidebar-menu-btn`
- [ ] L72 · **button** · Chatbot · `class=sidebar-menu-btn`
- [ ] L76 · **button** · Cấu hình · `class=sidebar-menu-btn`
- [ ] L84 · **a** · Về trang khách · `class=btn-sidebar-footer`
- [ ] L88 · **button** · Đăng xuất · `btnSidebarLogout`
- [ ] L99 · **button** · Mở menu quản trị · `btnMobileMenuToggle`

### pages/admin/modules/chatbot/chatbot.html — 146 điều khiển

#### subtab-tab-live-support — 40
- [ ] L11 · **input / text** · Tìm tên khách, SĐT... · `inboxSearchInput`
- [ ] L16 · **button** · Xử lý ngay — · `filterTabUrgent`
- [ ] L20 · **button** · Đang chat — · `filterTabActive`
- [ ] L24 · **button** · Tất cả — · `filterTabAll`
- [ ] L69 · **button** · Tác vụ thêm · `btnChatActionsDots`
- [ ] L71 · **button** · Tặng điểm Pawpoint · `btnRewardPoints`
- [ ] L72 · **button** · Chuyển thành Ticket · `btnConvertToTicket`
- [ ] L73 · **button** · Chuyển cấp Quản lý · `btnEscalateManager`
- [ ] L74 · **button** · Hoàn tất ca chat · `btnResolveChatAction`
- [ ] L78 · **button** · Mở tóm tắt AI · `btnShowAiContext`
- [ ] L82 · **button** · Hoàn tất ca · `btnHeaderResolveChat`
- [ ] L83 · **button** · Tiếp nhận · `btnToggleTakeover`
- [ ] L91 · **button** · Xem thêm · `btnExpandAiContext`
- [ ] L93 · **button** · Vận đơn · `btnContextTrackOrder`
- [ ] L94 · **button** · Camera · `btnContextPetCamera`
- [ ] L96 · **button** · Thu gọn tóm tắt AI · `btnHideAiContext`
- [ ] L116 · **button** · Gợi ý trước · `btnSuggestPrev`
- [ ] L121 · **button** · Gợi ý tiếp theo · `btnSuggestNext`
- [ ] L122 · **button** · Áp dụng · `btnApplySuggest`
- [ ] L126 · **button** · Mẫu nhanh ▾ · `btnToggleQuickTemplates`
- [ ] L128 · **button** · Lời chào tiếp nhận · `class=quick-reply-pill`
- [ ] L129 · **button** · Xin lỗi giao trễ · `class=quick-reply-pill`
- [ ] L130 · **button** · Yêu cầu gửi ảnh · `class=quick-reply-pill`
- [ ] L131 · **button** · Tặng điểm tạ lỗi · `class=quick-reply-pill`
- [ ] L135 · **button** · Chèn thẻ ▾ · `btnToggleSolutionCards`
- [ ] L137 · **button** · Thẻ Ưu đãi Voucher · `btnInsertVoucherCard`
- [ ] L138 · **button** · Thẻ Lịch hẹn Dịch vụ · `btnInsertBookingCard`
- [ ] L139 · **button** · Thẻ Đơn hàng gần nhất · `btnInsertOrderCard`
- [ ] L142 · **button** · Thư viện câu mẫu · `btnOpenCannedModal`
- [ ] L143 · **button** · Thu gọn thanh gợi ý · `btnHideAssistantBar`
- [ ] L156 · **button** · Bỏ đính kèm · `adminChatAttachPreviewRemove`
- [ ] L158 · **textarea** · Gõ tin nhắn gửi khách hàng... (Enter để gửi, Shift+Enter xuống dòng) · `chatMessageInput`
- [ ] L164 · **button** · Mở gợi ý AI · `btnShowAssistantBar`
- [ ] L167 · **input / file** · (không có nhãn hiển thị) · `adminChatFileInput`
- [ ] L168 · **button** · Gửi ảnh thú cưng / đơn hàng · `btnAdminChatAttach`
- [ ] L169 · **button** · Gửi tin · `btnSendLiveMessage`
- [ ] L213 · **a** · SP-2026-003 · `linkRecentOrder`
- [ ] L217 · **a** · BKG-1001 · `linkRecentBooking`
- [ ] L233 · **textarea** · Ghi chú nội bộ bí mật về khách hàng hoặc diễn biến ca chat... · `chatInternalNoteInput`
- [ ] L235 · **button** · Lưu ghi chú · `btnSaveChatInternalNote`

#### subtab-tab-ai-copilot — 8
- [ ] L255 · **button** · Xóa lịch sử chat · `btnClearCopilotChat`
- [ ] L256 · **button** · Đồng bộ tri thức RAG · `btnSyncRagData`
- [ ] L277 · **button** · Lịch hẹn Spa hôm nay · `class=copilot-pill-btn`
- [ ] L278 · **button** · Sản phẩm sắp hết hàng · `class=copilot-pill-btn`
- [ ] L279 · **button** · Soạn thư xin lỗi giao trễ · `class=copilot-pill-btn`
- [ ] L280 · **button** · Tóm tắt khiếu nại tồn đọng · `class=copilot-pill-btn`
- [ ] L285 · **textarea** · Nhập câu hỏi tra cứu dữ liệu hoặc yêu cầu soạn thảo văn bản hỗ trợ... (Nhấn Enter để gửi, Shift · `copilotInput`
- [ ] L286 · **button** · Gửi yêu cầu · `btnSendCopilot`

#### subtab-tab-chatbot-rules — 25
- [ ] L297 · **button** · Kho tri thức FAQ 91 · `class=rules-hub-tab-btn.active`
- [ ] L298 · **button** · Màng lọc Toxic Shield 127 · `class=rules-hub-tab-btn`
- [ ] L299 · **button** · Mẫu câu phản hồi 11 · `class=rules-hub-tab-btn`
- [ ] L300 · **button** · Hạn mức bồi hoàn và chuyển giao 54 · `class=rules-hub-tab-btn`
- [ ] L301 · **button** · Ma trận kịch bản Benchmark 24 · `class=rules-hub-tab-btn`
- [ ] L302 · **button** · Quy chuẩn văn hóa CSKH · `class=rules-hub-tab-btn`
- [ ] L312 · **input / text** · Tìm câu hỏi, câu trả lời hoặc từ khóa... · `inputFaqSearch`
- [ ] L313 · **select** · Tất cả danh mục · `selectFaqCategoryFilter`; lựa chọn: Tất cả danh mục
- [ ] L316 · **select** · Tất cả trạng thái Đang kích hoạt Tạm tắt · `selectFaqStatusFilter`; lựa chọn: Tất cả trạng thái, Đang kích hoạt, Tạm tắt
- [ ] L323 · **button** · Thêm câu hỏi FAQ · `btnOpenAddFaqModal`
- [ ] L359 · **input / text** · Tìm từ khóa thô tục, tiêu cực hoặc xúc phạm... · `inputProfanitySearch`
- [ ] L360 · **select** · Tất cả mức độ Khẩn cấp Mức độ cao Mức độ trung bình Mức độ thấp · `selectProfanitySeverityFilter`; lựa chọn: Tất cả mức độ, Khẩn cấp, Mức độ cao, Mức độ trung bình, Mức độ thấp
- [ ] L367 · **select** · Tất cả hành động Che mờ ký tự Cảnh báo nhắc nhở Chặn tạm thời 15 phút · `selectProfanityActionFilter`; lựa chọn: Tất cả hành động, Che mờ ký tự, Cảnh báo nhắc nhở, Chặn tạm thời 15 phút
- [ ] L373 · **select** · Tất cả trạng thái Đang kích hoạt Tạm tắt · `selectProfanityStatusFilter`; lựa chọn: Tất cả trạng thái, Đang kích hoạt, Tạm tắt
- [ ] L380 · **button** · Thêm từ cấm · `btnOpenAddProfanityModal`
- [ ] L413 · **input / text** · Tìm theo tiêu đề, phím tắt hoặc nội dung... · `inputCannedSearch`
- [ ] L414 · **select** · Tất cả chủ đề · `selectCannedCategoryFilter`; lựa chọn: Tất cả chủ đề
- [ ] L417 · **select** · Tất cả trạng thái Đang kích hoạt Tạm tắt · `selectCannedStatusFilter`; lựa chọn: Tất cả trạng thái, Đang kích hoạt, Tạm tắt
- [ ] L424 · **button** · Thêm câu mẫu · `btnOpenAddCannedModal`
- [ ] L459 · **button** · Hạn mức bồi hoàn Pawpoint (33) · `btnToggleCompPolicy`
- [ ] L460 · **button** · Quy tắc chuyển ca CSKH (21) · `btnToggleHandoverRule`
- [ ] L462 · **input / text** · Tìm theo sự cố, điều kiện kích hoạt... · `inputPolicySearch`
- [ ] L559 · **input / text** · Tìm theo tên tình huống hoặc từ khóa... · `inputMatrixSearch`
- [ ] L560 · **select** · Tất cả kết quả Đạt chuẩn (Passed) Chưa đạt (Failed) · `selectMatrixStatusFilter`; lựa chọn: Tất cả kết quả, Đạt chuẩn (Passed), Chưa đạt (Failed)
- [ ] L567 · **button** · Chạy kiểm thử Benchmark · `btnRunBenchmarkUI`

#### rewardPointsModalOverlay — 9
- [ ] L603 · **button** · Đóng · `btnCancelRewardPoints`
- [ ] L609 · **input / text** · (không có nhãn hiển thị) · `rewardCustomerName`
- [ ] L614 · **button** · +50 điểm · `class=admin-btn.admin-btn-secondary`
- [ ] L615 · **button** · +100 điểm · `class=admin-btn.admin-btn-secondary`
- [ ] L616 · **button** · +200 điểm · `class=admin-btn.admin-btn-secondary`
- [ ] L618 · **input / number** · (không có nhãn hiển thị) · `inputCustomRewardPoints`
- [ ] L622 · **select** · Giao hàng trễ so với cam kết Đổi giờ hẹn dịch vụ đột xuất Tạ lỗi vì sự cố dịch vụ nhỏ Khách hàn · `selectRewardReason`; lựa chọn: Giao hàng trễ so với cam kết, Đổi giờ hẹn dịch vụ đột xuất, Tạ lỗi vì sự cố dịch vụ nhỏ, Khách hàng thân thiết tri ân
- [ ] L631 · **button** · Hủy · `btnDismissRewardModal`
- [ ] L632 · **button** · Xác nhận nạp điểm · `btnConfirmRewardPoints`

#### convertTicketModalOverlay — 8
- [ ] L645 · **button** · Đóng · `btnCancelConvertTicket`
- [ ] L651 · **select** · Khiếu nại Đơn hàng và Sản phẩm Khiếu nại Dịch vụ Spa và Khách sạn · `selectConvertTicketCategory`; lựa chọn: Khiếu nại Đơn hàng và Sản phẩm, Khiếu nại Dịch vụ Spa và Khách sạn
- [ ] L659 · **input / text** · Nhập hoặc chọn đơn hàng / lịch hẹn liên quan... · `inputConvertRefId`
- [ ] L668 · **button** · ✕ Bỏ chọn · `btnClearSelectedRef`
- [ ] L673 · **input / text** · Tóm tắt vấn đề của khách... · `inputConvertTicketTitle`
- [ ] L677 · **select** · Mức độ Cao (Khẩn cấp) Mức độ Trung bình Mức độ Thấp · `selectConvertPriority`; lựa chọn: Mức độ Cao (Khẩn cấp), Mức độ Trung bình, Mức độ Thấp
- [ ] L685 · **button** · Hủy · `btnDismissConvertTicket`
- [ ] L686 · **button** · Tạo vé khiếu nại · `btnConfirmConvertTicket`

#### escalateManagerModalOverlay — 7
- [ ] L699 · **button** · Đóng · `btnDismissEscalateModal`
- [ ] L705 · **input / text** · (không có nhãn hiển thị) · `escalateCustomerName`
- [ ] L709 · **select** · Khách hàng giận dữ, lời lẽ công kích vượt thẩm quyền nhân viên Thú cưng gặp sự cố sức khỏe, cần · `selectEscalateReason`; lựa chọn: Khách hàng giận dữ, lời lẽ công kích vượt thẩm quyền nhân viên, Thú cưng gặp sự cố sức khỏe, cần Bác sĩ thăm khám trực tiếp, Yêu cầu bồi thường lớn cần Trưởng c
- [ ] L717 · **select** · Trần Hoàng Nam - Quản lý Chi nhánh Quận 1 Bác sĩ Thú y Trực ban - Chi nhánh Quận 1 Lê Lệ Quyên  · `selectEscalateTarget`; lựa chọn: Trần Hoàng Nam - Quản lý Chi nhánh Quận 1, Bác sĩ Thú y Trực ban - Chi nhánh Quận 1, Lê Lệ Quyên - Trưởng nhóm CSKH
- [ ] L725 · **textarea** · Ghi chú thêm cho Quản lý và Bác sĩ... · `inputEscalateNotes`
- [ ] L732 · **button** · Hủy · `btnCancelEscalate`
- [ ] L733 · **button** · Xác nhận chuyển ca · `btnConfirmEscalate`

#### cannedResponsesModalOverlay — 4
- [ ] L746 · **button** · Đóng · `btnDismissCannedModal`
- [ ] L751 · **input / text** · Tìm câu mẫu theo từ khóa (giao trễ, xin lỗi, bồi hoàn, camera...)... · `inputSearchCanned`
- [ ] L752 · **select** · Tất cả chủ đề (15) Chào hỏi và Tiếp nhận (3) Vận chuyển và Giao hàng (3) Spa và Khách sạn (3) B · `selectCannedCategory`; lựa chọn: Tất cả chủ đề (15), Chào hỏi và Tiếp nhận (3), Vận chuyển và Giao hàng (3), Spa và Khách sạn (3), Bồi hoàn và Tạ lỗi (3), Khiếu nại và Đối soát (3)
- [ ] L768 · **button** · Đóng · `btnCloseCannedModalBottom`

#### orderTrackingModalOverlay — 3
- [ ] L780 · **button** · Đóng · `btnDismissTrackingModal`
- [ ] L820 · **button** · Đóng · `btnCancelTrackingModal`
- [ ] L821 · **button** · Gửi thẻ vận đơn vào chat · `btnSendTrackingCardToChat`

#### petCameraModalOverlay — 3
- [ ] L833 · **button** · Đóng · `btnDismissCameraModal`
- [ ] L856 · **button** · Đóng · `btnCancelCameraModal`
- [ ] L857 · **button** · Gửi ảnh snapshot vào chat · `btnSendCameraSnapshotToChat`

#### modalConfirmChatbotAction — 3
- [ ] L869 · **button** · Đóng · `btnCloseConfirmChatbotModal`
- [ ] L877 · **button** · Hủy · `btnCancelChatbotConfirm`
- [ ] L878 · **button** · Đồng ý · `btnAcceptChatbotConfirm`

#### modalFaqEditorOverlay — 10
- [ ] L890 · **button** · Đóng · `btnCloseFaqEditorModal`
- [ ] L894 · **input / hidden** · (không có nhãn hiển thị) · `inputFaqEditId`
- [ ] L897 · **input / text** · Ví dụ: Thông tin dịch vụ, Đặt lịch hẹn, Chính sách... · `inputFaqCategory`
- [ ] L901 · **input / text** · Nhập câu hỏi thường gặp... · `inputFaqQuestionText`
- [ ] L905 · **textarea** · Nội dung bot hoặc nhân viên sẽ giải đáp cho khách... · `textareaFaqAnswerText`
- [ ] L909 · **input / text** · Ví dụ: giá tắm sấy, bảng giá spa, dịch vụ grooming... · `inputFaqKeywordsList`
- [ ] L914 · **input / number** · (không có nhãn hiển thị) · `inputFaqPriorityNum`
- [ ] L918 · **input / checkbox** · Kích hoạt trả lời tự động · `checkboxFaqIsActive`; thử cả hai trạng thái
- [ ] L925 · **button** · Hủy · `btnCancelFaqEditor`
- [ ] L926 · **button** · Lưu câu hỏi FAQ · `btnSaveFaqRecord`

#### modalProfanityEditorOverlay — 9
- [ ] L939 · **button** · Đóng · `btnCloseProfanityEditorModal`
- [ ] L943 · **input / hidden** · (không có nhãn hiển thị) · `inputProfanityEditId`
- [ ] L946 · **input / text** · Nhập từ thô tục, tiêu cực hoặc xúc phạm... · `inputProfanityKeywordText`
- [ ] L951 · **select** · Khẩn cấp (critical) Mức độ cao (high) Trung bình (medium) Mức độ thấp (low) · `selectProfanitySeverityVal`; lựa chọn: Khẩn cấp (critical), Mức độ cao (high), Trung bình (medium), Mức độ thấp (low)
- [ ] L960 · **select** · Che mờ ký tự (mask) Cảnh báo nhắc nhở (warn) Chặn tạm thời 15 phút (block) · `selectProfanityActionVal`; lựa chọn: Che mờ ký tự (mask), Cảnh báo nhắc nhở (warn), Chặn tạm thời 15 phút (block)
- [ ] L970 · **input / text** · (không có nhãn hiển thị) · `inputProfanityReplacementVal`
- [ ] L974 · **input / checkbox** · Kích hoạt màng lọc · `checkboxProfanityIsActive`; thử cả hai trạng thái
- [ ] L981 · **button** · Hủy · `btnCancelProfanityEditor`
- [ ] L982 · **button** · Lưu từ cấm · `btnSaveProfanityRecord`

#### modalCannedEditorOverlay — 9
- [ ] L995 · **button** · Đóng · `btnCloseCannedEditorModal`
- [ ] L999 · **input / hidden** · (không có nhãn hiển thị) · `inputCannedEditId`
- [ ] L1003 · **input / text** · /chao, /loi... · `inputCannedShortcutText`
- [ ] L1007 · **input / text** · Tiêu đề gợi nhớ cho nhân viên... · `inputCannedTitleText`
- [ ] L1012 · **input / text** · Tiếp nhận hội thoại, Vận chuyển, Xử lý sự cố... · `inputCannedCategoryText`
- [ ] L1016 · **textarea** · Dạ PawPal xin chào sen... · `textareaCannedContentText`
- [ ] L1020 · **input / checkbox** · Kích hoạt mẫu câu · `checkboxCannedIsActive`; thử cả hai trạng thái
- [ ] L1026 · **button** · Hủy · `btnCancelCannedEditor`
- [ ] L1027 · **button** · Lưu mẫu câu · `btnSaveCannedRecord`

#### modalResolveChatOverlay — 7
- [ ] L1040 · **button** · Đóng · `btnCloseResolveChatModal`
- [ ] L1046 · **input / text** · (không có nhãn hiển thị) · `resolveChatCustomerName`
- [ ] L1050 · **select** · Đã giải quyết trọn vẹn yêu cầu của khách Đã tư vấn dịch vụ Spa / Grooming / Hotel Đã xử lý thôn · `selectResolveReason`; lựa chọn: Đã giải quyết trọn vẹn yêu cầu của khách, Đã tư vấn dịch vụ Spa / Grooming / Hotel, Đã xử lý thông tin đơn hàng và vận chuyển, Đã lập vé khiếu nại chuyển bộ phậ
- [ ] L1060 · **textarea** · Tóm tắt ngắn nội dung đã hỗ trợ khách hàng... · `textareaResolveNotes`
- [ ] L1064 · **input / checkbox** · Gửi biểu mẫu đánh giá mức độ hài lòng (CSAT) cho khách hàng · `checkboxSendCsatSurvey`; thử cả hai trạng thái
- [ ] L1070 · **button** · Hủy · `btnCancelResolveChat`
- [ ] L1071 · **button** · Xác nhận hoàn tất · `btnConfirmResolveChat`

#### modalAdminImageLightbox — 1
- [ ] L1082 · **button** · Đóng · `btnCloseAdminLightbox`

### pages/admin/modules/complaints/complaints.html — 101 điều khiển

#### subtab-tab-complaint-services — 15
- [ ] L41 · **button** · Lọc ca cần xử lý gấp · `btnFilterUrgentService`
- [ ] L49 · **input / text** · Tìm mã khiếu nại, mã lịch hẹn, tên khách, số điện thoại, tên Pet... · `serviceSearchInput`
- [ ] L52 · **button** · Xuất file · `btnExportServiceComplaints`
- [ ] L53 · **button** · Tạo khiếu nại · `btnOpenCreateServiceTicket`
- [ ] L59 · **button** · Tất cả · `class=quick-chip-btn.active`
- [ ] L60 · **button** · Của tôi phụ trách · `class=quick-chip-btn`
- [ ] L61 · **button** · Chưa phân công · `class=quick-chip-btn`
- [ ] L62 · **button** · Chờ quản lý duyệt · `class=quick-chip-btn`
- [ ] L63 · **button** · Xử lý lần 2 · `class=quick-chip-btn`
- [ ] L64 · **button** · Quá hạn SLA · `class=quick-chip-btn`
- [ ] L65 · **button** · Mức độ Cao · `class=quick-chip-btn`
- [ ] L71 · **select** · Tất cả Spa và Grooming Pet Hotel Pet Taxi Liên hệ và Hỗ trợ chung · `serviceFilterCategory`; lựa chọn: Tất cả, Spa và Grooming, Pet Hotel, Pet Taxi, Liên hệ và Hỗ trợ chung
- [ ] L82 · **select** · Tất cả Chưa xử lý Đang xử lý Chờ phản hồi khách hàng Chờ quản lý duyệt Đang xử lý lần 2 Đã giải · `serviceFilterStatus`; lựa chọn: Tất cả, Chưa xử lý, Đang xử lý, Chờ phản hồi khách hàng, Chờ quản lý duyệt, Đang xử lý lần 2, Đã giải quyết, Đã đóng
- [ ] L96 · **select** · Tất cả Cao Trung bình Thấp · `serviceFilterPriority`; lựa chọn: Tất cả, Cao, Trung bình, Thấp
- [ ] L106 · **select** · Tất cả Chưa phân công · `serviceFilterStaff`; lựa chọn: Tất cả, Chưa phân công

#### subtab-tab-complaint-orders — 15
- [ ] L184 · **button** · Lọc ca cần xử lý gấp · `btnFilterUrgentOrder`
- [ ] L191 · **input / text** · Tìm mã khiếu nại, mã đơn hàng, khách hàng, số điện thoại, tên sản phẩm... · `orderSearchInput`
- [ ] L194 · **button** · Xuất file · `btnExportOrderComplaints`
- [ ] L195 · **button** · Tạo khiếu nại · `btnOpenCreateOrderTicket`
- [ ] L201 · **button** · Tất cả · `class=quick-chip-btn.active`
- [ ] L202 · **button** · Của tôi phụ trách · `class=quick-chip-btn`
- [ ] L203 · **button** · Chưa phân công · `class=quick-chip-btn`
- [ ] L204 · **button** · Chờ quản lý duyệt · `class=quick-chip-btn`
- [ ] L205 · **button** · Xử lý lần 2 · `class=quick-chip-btn`
- [ ] L206 · **button** · Quá hạn SLA · `class=quick-chip-btn`
- [ ] L207 · **button** · Mức độ Cao · `class=quick-chip-btn`
- [ ] L213 · **select** · Tất cả Sai sản phẩm Thiếu hàng Hư hỏng Chất lượng sản phẩm Giao hàng trễ Yêu cầu Đổi và Trả Khá · `orderFilterIssue`; lựa chọn: Tất cả, Sai sản phẩm, Thiếu hàng, Hư hỏng, Chất lượng sản phẩm, Giao hàng trễ, Yêu cầu Đổi và Trả, Khác
- [ ] L227 · **select** · Tất cả Chưa xử lý Đang xử lý Chờ nhận hàng trả Chờ quản lý duyệt Đang xử lý lần 2 Đã giải quyết · `orderFilterStatus`; lựa chọn: Tất cả, Chưa xử lý, Đang xử lý, Chờ nhận hàng trả, Chờ quản lý duyệt, Đang xử lý lần 2, Đã giải quyết, Đã đóng
- [ ] L241 · **select** · Tất cả Cao Trung bình Thấp · `orderFilterPriority`; lựa chọn: Tất cả, Cao, Trung bình, Thấp
- [ ] L251 · **select** · Tất cả Chưa phân công · `orderFilterStaff`; lựa chọn: Tất cả, Chưa phân công

#### subtab-tab-complaint-detail — 22
- [ ] L302 · **button** · Chuyển người phụ trách · `btnAssignHandler`
- [ ] L303 · **button** · Yêu cầu bổ sung · `btnRequestMoreInfo`
- [ ] L304 · **button** · Chọn phương án giải quyết · `btnOpenResolveModal`
- [ ] L305 · **button** · Mở lại Ticket · `btnReopenTicket`
- [ ] L318 · **input / file** · (không có nhãn hiển thị) · `inputUploadMoreEvidence`
- [ ] L319 · **button** · Tải ảnh bằng chứng từ máy · `btnTriggerUploadMoreEvidence`
- [ ] L358 · **a** · BKG-1001 · `linkToOriginalTransaction`
- [ ] L380 · **input / file** · (không có nhãn hiển thị) · `inputUploadCheckinPhoto`
- [ ] L381 · **button** · Bổ sung ảnh đón bé · `btnTriggerUploadCheckinPhoto`
- [ ] L392 · **button** · Tạm khóa an toàn KTV · `btnToggleStaffSafetyLock`
- [ ] L406 · **input / file** · (không có nhãn hiển thị) · `inputUploadWarehousePhoto`
- [ ] L407 · **button** · Bổ sung ảnh kho · `btnTriggerUploadWarehousePhoto`
- [ ] L430 · **button** · Xem chi tiết giao dịch gốc · `btnJumpToOriginal`
- [ ] L477 · **button** · Cập nhật tiến độ RMA tiếp theo · `btnAdvanceRmaStep`
- [ ] L546 · **button** · Từ chối đề xuất · `btnManagerRejectProposal`
- [ ] L547 · **button** · Phê duyệt bồi hoàn · `btnManagerApproveProposal`
- [ ] L559 · **button** · Mở lại Ticket · `btnTriggerReopenTicket`
- [ ] L569 · **button** · Hoàn tất can thiệp lần 2 · `btnResolveReprocess`
- [ ] L588 · **input / radio** · Ghi chú nội bộ (Chỉ nhân viên thấy) · `class=`; thử cả hai trạng thái
- [ ] L589 · **input / radio** · Phản hồi cho khách hàng · `class=`; thử cả hai trạng thái
- [ ] L591 · **textarea** · Nhập nội dung ghi nhận vào nhật ký... · `replyContentInput`
- [ ] L593 · **button** · Lưu và cập nhật nhật ký · `btnSubmitReply`

#### createTicketModalOverlay — 16
- [ ] L609 · **button** · Đóng · `btnCancelCreateTicket`
- [ ] L615 · **input / text** · Nhập 10 số điện thoại... · `inputTicketCustomerPhone`
- [ ] L621 · **input / text** · Tự động điền theo SĐT hoặc tìm tên... · `inputTicketCustomerName`
- [ ] L630 · **button** · ✕ Bỏ chọn · `btnClearTicketCustomer`
- [ ] L636 · **input / text** · Tìm mã giao dịch hoặc chọn từ danh sách... · `inputTicketRefSearch`
- [ ] L637 · **input / hidden** · (không có nhãn hiển thị) · `selectTicketRefId`
- [ ] L642 · **button** · ✕ Bỏ chọn · `btnClearTicketRef`
- [ ] L648 · **select** · Trung bình Cao (Khẩn cấp) Thấp · `selectTicketPriority`; lựa chọn: Trung bình, Cao (Khẩn cấp), Thấp
- [ ] L658 · **input / checkbox** · Chưa xác minh giao dịch (Tạo vé tiếp nhận trước, liên kết giao dịch sau) · `chkTicketUnverified`; thử cả hai trạng thái
- [ ] L669 · **input / text** · Ví dụ: Bé trầy xước sau khi tắm sấy... · `inputTicketTitle`
- [ ] L674 · **textarea** · Mô tả cụ thể sự việc khách phản ánh... · `inputTicketContent`
- [ ] L680 · **input / text** · (không có nhãn hiển thị) · `inputTicketReceiver`
- [ ] L685 · **input / file** · (không có nhãn hiển thị) · `inputTicketFiles`
- [ ] L686 · **button** · Chọn ảnh từ máy tính hoặc điện thoại · `btnTriggerUploadTicketFiles`
- [ ] L693 · **button** · Hủy · `btnDismissCreateTicket`
- [ ] L694 · **button** · Tạo khiếu nại · `btnSaveCreateTicket`

#### resolveTicketModalOverlay — 17
- [ ] L706 · **button** · Đóng · `btnCancelResolveModal`
- [ ] L715 · **select** · Giải thích và phản hồi khách hàng Thực hiện lại dịch vụ (Miễn phí) Đổi kỹ thuật viên chăm sóc H · `selectResolveOption`; lựa chọn: Giải thích và phản hồi khách hàng, Thực hiện lại dịch vụ (Miễn phí), Đổi kỹ thuật viên chăm sóc, Hoàn tiền (Một phần hoặc toàn bộ), Đổi sản phẩm mới (Tạo mã RMA
- [ ] L733 · **input / text** · (không có nhãn hiển thị) · `inputResolveRmaCode`
- [ ] L737 · **select** · Bưu tá Pawpal / GHN tới tận nơi lấy hàng Khách hàng tự gửi bưu điện về kho · `selectResolveRmaPickup`; lựa chọn: Bưu tá Pawpal / GHN tới tận nơi lấy hàng, Khách hàng tự gửi bưu điện về kho
- [ ] L745 · **select** · Kho Pawpal Tân Bình (123 Hoàng Văn Thụ, Q. Tân Bình, TP.HCM) Kho Pawpal Thủ Đức (45 Võ Văn Ngân · `selectResolveRmaWarehouse`; lựa chọn: Kho Pawpal Tân Bình (123 Hoàng Văn Thụ, Q. Tân Bình, TP.HCM), Kho Pawpal Thủ Đức (45 Võ Văn Ngân, TP. Thủ Đức, TP.HCM)
- [ ] L752 · **input / text** · Tìm tên sản phẩm hoặc mã SKU... · `inputResolveRmaReplacement`
- [ ] L757 · **button** · ✕ Bỏ chọn · `btnClearResolveRmaProduct`
- [ ] L762 · **input / number** · Ví dụ: 350000... · `inputResolveRmaRefundAmount`
- [ ] L772 · **input / text** · Ví dụ: 09:30 - 30/09/2026 · `inputResolveRedoTime`
- [ ] L776 · **select** · Trần Văn Hùng (Groomer trưởng) Lê Lệ Quyên (Quản lý chi nhánh) Nguyễn Văn A (Kỹ thuật viên cao  · `selectResolveRedoStaff`; lựa chọn: Trần Văn Hùng (Groomer trưởng), Lê Lệ Quyên (Quản lý chi nhánh), Nguyễn Văn A (Kỹ thuật viên cao cấp)
- [ ] L791 · **input / number** · Ví dụ: 200 (Tương đương 20.000đ)... · `inputResolveRewardPoints`
- [ ] L795 · **input / text** · Ví dụ: PAWPALCARE50 - Giảm 50%... · `inputResolveRewardVoucher`
- [ ] L806 · **input / number** · Ví dụ: 250000... · `inputResolveRefundAmount`
- [ ] L810 · **select** · Chuyển khoản trực tiếp về số tài khoản khách hàng Hoàn vào ví điểm Pawpoint của khách hàng Hoàn · `selectResolveRefundMethod`; lựa chọn: Chuyển khoản trực tiếp về số tài khoản khách hàng, Hoàn vào ví điểm Pawpoint của khách hàng, Hoàn tiền mặt trực tiếp tại quầy
- [ ] L821 · **textarea** · Ghi rõ lý do và thỏa thuận đã đạt được với khách... · `inputResolveNote`
- [ ] L825 · **button** · Hủy · `btnDismissResolveModal`
- [ ] L826 · **button** · Xác nhận giải quyết · `btnConfirmResolveTicket`

#### assignHandlerModalOverlay — 5
- [ ] L838 · **button** · Đóng · `btnCancelAssignHandler`
- [ ] L843 · **select** · (không có nhãn hiển thị) · `selectAssignStaff`
- [ ] L849 · **textarea** · Nhập lý do chuyển giao hoặc hướng dẫn xử lý tiếp theo... · `inputAssignNote`
- [ ] L853 · **button** · Hủy · `btnDismissAssignHandler`
- [ ] L854 · **button** · Xác nhận chuyển giao · `btnConfirmAssignHandler`

#### requestMoreInfoModalOverlay — 5
- [ ] L866 · **button** · Đóng · `btnCancelRequestInfo`
- [ ] L871 · **select** · Tin nhắn Zalo OA Tin nhắn SMS Brandname Ghi nhận cuộc gọi tư vấn Thư điện tử (Email) · `selectRequestChannel`; lựa chọn: Tin nhắn Zalo OA, Tin nhắn SMS Brandname, Ghi nhận cuộc gọi tư vấn, Thư điện tử (Email)
- [ ] L880 · **textarea** · Nhập nội dung gửi cho khách hàng... · `inputRequestMessage`
- [ ] L887 · **button** · Hủy · `btnDismissRequestInfo`
- [ ] L888 · **button** · Gửi yêu cầu · `btnSendRequestInfo`

#### imagePreviewModalOverlay — 2
- [ ] L899 · **button** · Đóng · `btnCloseImagePreview`
- [ ] L906 · **button** · Đóng · `btnDismissImagePreview`

#### Khung chung / ngoài tab — 4
- [ ] L913 · **button** · Xem chi tiết Ticket · `menuActionViewTicket`
- [ ] L914 · **button** · Nhận xử lý Ticket · `menuActionQuickAssign`
- [ ] L915 · **button** · Phương án giải quyết · `menuActionQuickResolve`
- [ ] L916 · **button** · Đóng Ticket · `menuActionCloseTicket`

### pages/admin/modules/customers/customers.html — 89 điều khiển

#### subtab-tab-list — 8
- [ ] L41 · **button** · Lọc danh sách · `btnFilterComplaintQuick`
- [ ] L49 · **input / text** · Tìm SĐT, Họ tên, Bé cưng, Email... · `custSearchInput`
- [ ] L52 · **button** · Xuất file · `btnExportCustomerReport`
- [ ] L53 · **button** · Thêm khách · `btnOpenAddCustomerModal`
- [ ] L60 · **select** · Tất cả Bạc Vàng Kim Cương · `custFilterTier`; lựa chọn: Tất cả, Bạc, Vàng, Kim Cương
- [ ] L70 · **select** · Tất cả Thành viên Vãng lai Bị khóa · `custFilterStatus`; lựa chọn: Tất cả, Thành viên, Vãng lai, Bị khóa
- [ ] L78 · **button** · Có khiếu nại · `btnFilterComplaintOnly`
- [ ] L79 · **button** · Xóa bộ lọc · `btnCustClearFilters`

#### subtab-tab-profile — 15
- [ ] L179 · **a** · Gọi điện · `class=action-btn-pill`
- [ ] L180 · **a** · Zalo · `class=action-btn-pill`
- [ ] L181 · **button** · Đặt lịch · `class=action-btn-pill.btn-link-service`
- [ ] L182 · **button** · Lên đơn · `class=action-btn-pill.btn-link-order`
- [ ] L183 · **button** · Khiếu nại · `class=action-btn-pill.btn-link-complaint`
- [ ] L194 · **button** · Cá nhân · `class=drawer-tab-btn.active`
- [ ] L195 · **button** · Thú cưng · `class=drawer-tab-btn`
- [ ] L196 · **button** · Đơn hàng 0 · `class=drawer-tab-btn`
- [ ] L200 · **button** · Lịch hẹn 0 · `class=drawer-tab-btn`
- [ ] L204 · **button** · Khiếu nại 0 · `class=drawer-tab-btn`
- [ ] L218 · **button** · Sửa hồ sơ · `btnOpenEditProfileModal`
- [ ] L236 · **button** · Gửi lại SMS · `btnResendSmsToken`
- [ ] L242 · **textarea** · Ghi chú sở thích, tính cách khách hàng... · `drawerCustNote`
- [ ] L244 · **button** · Lưu ghi chú · `btnSaveCustomerNote`
- [ ] L254 · **button** · Thêm bé cưng · `btnOpenAddPetModal`

#### subtab-tab-pawpoint — 4
- [ ] L369 · **button** · Xuất file · `btnExportPawpointHistory`
- [ ] L370 · **button** · Điều chỉnh điểm · `btnOpenAdjustPointsModal`
- [ ] L374 · **input / text** · Tìm theo tên hoặc SĐT... · `pawpointSearchInput`
- [ ] L375 · **select** · Tất cả giao dịch Cộng điểm Trừ điểm · `pawpointFilterType`; lựa chọn: Tất cả giao dịch, Cộng điểm, Trừ điểm

#### modalAddCustomer — 11
- [ ] L406 · **button** · Đóng · `btnCloseAddCustomer`
- [ ] L411 · **input / text** · Nhập họ tên... · `quickAddName`
- [ ] L415 · **input / tel** · 0901234567 (Bắt buộc 10 số) · `quickAddPhone`
- [ ] L418 · **a** · Mở hồ sơ ngay · `btnOpenDupCustomer`
- [ ] L423 · **input / text** · Ví dụ: Bé Lu, Bé Miu... · `quickAddPetName`
- [ ] L428 · **select** · Chó Mèo Khác · `quickAddPetSpecies`; lựa chọn: Chó, Mèo, Khác
- [ ] L436 · **input / number** · Ví dụ: 4.5 · `quickAddPetWeight`
- [ ] L442 · **input / text** · Ví dụ: Corgi, Poodle, Mèo ALN... · `quickAddPetBreed`
- [ ] L448 · **input / text** · Ví dụ: 120 Nguyễn Thị Minh Khai, Phường 6, Quận 3... · `quickAddAddress`
- [ ] L452 · **button** · Hủy · `btnCancelAddCustomer`
- [ ] L453 · **button** · Lưu khách hàng · `btnSubmitAddCustomer`

#### modalAdjustPoints — 13
- [ ] L466 · **button** · Đóng · `btnCloseAdjustPoints`
- [ ] L472 · **input / text** · Nhập tên hoặc số điện thoại khách cần điều chỉnh điểm... · `adjustPhone`
- [ ] L480 · **select** · Cộng điểm Trừ điểm · `adjustType`; lựa chọn: Cộng điểm, Trừ điểm
- [ ] L487 · **input / number** · Ví dụ: 50 · `adjustPointsVal`
- [ ] L492 · **input / text** · Nhập hoặc chọn lý do điều chỉnh... · `adjustReason`
- [ ] L494 · **button** · Bù sự cố trễ hẹn · `class=reason-quick-chip`
- [ ] L495 · **button** · Bù giao hàng chậm · `class=reason-quick-chip`
- [ ] L496 · **button** · Tặng điểm tri ân · `class=reason-quick-chip`
- [ ] L497 · **button** · Thu hồi do hủy đơn · `class=reason-quick-chip`
- [ ] L498 · **button** · Đổi quà tại quầy · `class=reason-quick-chip`
- [ ] L499 · **button** · Điều chỉnh sai lệch điểm · `class=reason-quick-chip`
- [ ] L503 · **button** · Hủy · `btnCancelAdjustPoints`
- [ ] L504 · **button** · Xác nhận điều chỉnh · `btnSubmitAdjustPoints`

#### modalEditCustomer — 11
- [ ] L517 · **button** · Đóng · `btnCloseEditCustomer`
- [ ] L520 · **input / hidden** · (không có nhãn hiển thị) · `editCustId`
- [ ] L523 · **input / text** · Nhập họ tên... · `editCustFullName`
- [ ] L528 · **input / tel** · 0901234567 (10 số) · `editCustPhone`
- [ ] L532 · **input / email** · example@email.com · `editCustEmail`
- [ ] L538 · **select** · Nam Nữ Khác · `editCustGender`; lựa chọn: Nam, Nữ, Khác
- [ ] L546 · **input / date** · (không có nhãn hiển thị) · `editCustDob`
- [ ] L551 · **select** · Bạc Vàng Kim Cương · `editCustTier`; lựa chọn: Bạc, Vàng, Kim Cương
- [ ] L560 · **button** · Thêm địa chỉ · `btnAddAddressItem`
- [ ] L568 · **button** · Hủy · `btnCancelEditCustomer`
- [ ] L569 · **button** · Lưu thay đổi · `btnSubmitEditCustomer`

#### modalAddPet — 14
- [ ] L582 · **button** · Đóng · `btnCloseAddPet`
- [ ] L588 · **input / text** · Ví dụ: Bé Bông, Bé Miu... · `addPetName`
- [ ] L592 · **select** · Chó Mèo Khác · `addPetSpecies`; lựa chọn: Chó, Mèo, Khác
- [ ] L602 · **input / text** · Ví dụ: Poodle, Corgi, Golden, Mèo Anh... · `addPetBreed`
- [ ] L604 · **button** · Poodle · `class=reason-quick-chip`
- [ ] L605 · **button** · Corgi · `class=reason-quick-chip`
- [ ] L606 · **button** · Golden · `class=reason-quick-chip`
- [ ] L607 · **button** · Phốc sóc · `class=reason-quick-chip`
- [ ] L608 · **button** · Mèo ALN · `class=reason-quick-chip`
- [ ] L613 · **input / number** · Ví dụ: 5.2 · `addPetWeight`
- [ ] L618 · **input / text** · Ví dụ: Đã tiêm dại và 7 bệnh mũi 2... · `addPetVaccine`
- [ ] L622 · **input / text** · Ví dụ: Dị ứng sữa tắm hoa hồng, sợ sấy... · `addPetAlert`
- [ ] L626 · **button** · Hủy · `btnCancelAddPet`
- [ ] L627 · **button** · Lưu bé cưng · `btnSubmitAddPet`

#### modalEditPet — 10
- [ ] L640 · **button** · Đóng · `btnCloseEditPet`
- [ ] L643 · **input / hidden** · (không có nhãn hiển thị) · `editPetId`
- [ ] L647 · **input / text** · Ví dụ: Bé Bông, Bé Miu... · `editPetName`
- [ ] L651 · **select** · Chó Mèo Khác · `editPetSpecies`; lựa chọn: Chó, Mèo, Khác
- [ ] L661 · **input / text** · Ví dụ: Poodle, Corgi, Golden, Mèo Anh... · `editPetBreed`
- [ ] L665 · **input / number** · Ví dụ: 5.2 · `editPetWeight`
- [ ] L670 · **input / text** · Ví dụ: Đã tiêm dại và 7 bệnh mũi 2... · `editPetVaccine`
- [ ] L674 · **input / text** · Ví dụ: Dị ứng sữa tắm hoa hồng, sợ sấy... · `editPetAlert`
- [ ] L678 · **button** · Hủy · `btnCancelEditPet`
- [ ] L679 · **button** · Lưu cập nhật · `btnSubmitEditPet`

#### modalConfirmCustomerAction — 3
- [ ] L692 · **button** · Đóng · `btnCloseCustConfirm`
- [ ] L698 · **button** · Hủy · `btnCancelCustConfirm`
- [ ] L699 · **button** · Xác nhận · `btnAcceptCustConfirm`

### pages/admin/modules/dashboard/dashboard.html — 18 điều khiển

#### Khung chung / ngoài tab — 15
- [ ] L29 · **button** · Xử lý ngay · `dashboardAlertAction`
- [ ] L39 · **button** · Tiếp nhận bé mới · `btnQuickReceptionPet`
- [ ] L40 · **button** · Đặt lịch Spa và Hotel · `btnQuickBookingService`
- [ ] L41 · **button** · Lên đơn bán lẻ · `btnQuickCreateOrder`
- [ ] L54 · **button** · Khiếu nại chờ xử lý · `dashboardPriorityComplaints`
- [ ] L58 · **button** · Đơn hàng chờ duyệt · `dashboardPriorityOrders`
- [ ] L67 · **button** · Xem kho · `btnDashboardViewAllStock`
- [ ] L93 · **button** · Tháng · `class=dashboard-calendar-view-btn.is-active`
- [ ] L94 · **button** · Tuần · `class=dashboard-calendar-view-btn`
- [ ] L95 · **button** · Ngày · `class=dashboard-calendar-view-btn`
- [ ] L97 · **button** · Xem tất cả · `class=dashboard-text-link`
- [ ] L105 · **button** · Quay về hôm nay · `dashboardCalendarToday`
- [ ] L106 · **button** · Tháng trước · `dashboardCalendarPrev`
- [ ] L107 · **button** · Tháng sau · `dashboardCalendarNext`
- [ ] L139 · **button** · Xem hội thoại · `class=dashboard-text-link`

#### dashboardBookingQuickModal — 3
- [ ] L167 · **button** · Đóng · `btnCloseBookingQuickModal`
- [ ] L179 · **button** · Quay lại · `btnDismissBookingModal`
- [ ] L180 · **button** · Chuyển sang ca Dịch vụ · `btnGoToServiceDetail`

### pages/admin/modules/orders/orders.html — 197 điều khiển

#### subtab-tab-order-list — 21
- [ ] L42 · **input / text** · Tìm mã đơn ORD, tên khách, số điện thoại, mã vận đơn... · `orderSearchInput`
- [ ] L45 · **button** · Xuất file · `btnExportOrderReport`
- [ ] L46 · **button** · Tạo đơn tại quầy · `btnOpenCreateOrderModal`
- [ ] L53 · **select** · Tất cả Chờ xác nhận Đang chuẩn bị Đang giao Đã giao Hoàn tất Đã hủy Đổi trả · `orderFilterStatus`; lựa chọn: Tất cả, Chờ xác nhận, Đang chuẩn bị, Đang giao, Đã giao, Hoàn tất, Đã hủy, Đổi trả
- [ ] L67 · **select** · Tất cả Tiền mặt COD VNPay MoMo Chuyển khoản · `orderFilterPayment`; lựa chọn: Tất cả, Tiền mặt COD, VNPay, MoMo, Chuyển khoản
- [ ] L78 · **select** · Tất cả đối soát Đã thanh toán và Đối soát Chờ bưu cục đối soát COD Chưa thanh toán Chờ hoàn tiề · `orderFilterPayStatus`; lựa chọn: Tất cả đối soát, Đã thanh toán và Đối soát, Chờ bưu cục đối soát COD, Chưa thanh toán, Chờ hoàn tiền, Đã hoàn tiền, Đã hủy thanh toán
- [ ] L89 · **button** · Có khiếu nại · `btnFilterComplaintOrders`
- [ ] L90 · **button** · Chờ xử lý gấp · `btnFilterUrgentOrders`
- [ ] L91 · **button** · Quá hạn SLA (>30p) · `btnFilterSlaOverdue`
- [ ] L92 · **button** · Xóa bộ lọc · `btnOrderClearFilters`
- [ ] L104 · **button** · Xác nhận đối soát toàn bộ · `btnQuickReconcileAllCod`
- [ ] L113 · **button** · Bỏ chọn · `btnBatchDeselectAll`
- [ ] L116 · **button** · In hàng loạt phiếu đóng gói · `btnBatchPrintPack`
- [ ] L117 · **button** · Bàn giao vận chuyển hàng loạt · `btnBatchDispatch`
- [ ] L118 · **button** · Xuất bảng kê bàn giao · `btnBatchExportManifest`
- [ ] L129 · **input / checkbox** · Chọn tất cả · `checkSelectAllOrders`; thử cả hai trạng thái
- [ ] L186 · **button** · < · `btnOrderPrev`
- [ ] L187 · **button** · 1 · `class=btn-pagination.active`
- [ ] L188 · **button** · 2 · `class=btn-pagination`
- [ ] L189 · **button** · 3 · `class=btn-pagination`
- [ ] L190 · **button** · > · `btnOrderNext`

#### subtab-tab-order-detail — 1
- [ ] L286 · **a** · Lê Lệ Quyên · `detailReceiverName`

#### subtab-tab-order-products — 7
- [ ] L366 · **input / text** · Tìm tên sản phẩm, mã SKU, thương hiệu... · `productSearchInput`
- [ ] L369 · **button** · Nhập hàng NCC · `btnOpenGoodsReceiptModal`
- [ ] L370 · **button** · Kiểm kê kho · `btnOpenStocktakeModal`
- [ ] L371 · **button** · Xuất file kho · `btnExportProductStock`
- [ ] L372 · **button** · Thêm sản phẩm · `btnOpenAddProductModal`
- [ ] L379 · **select** · Tất cả danh mục Thực phẩm Đồ dùng Vệ sinh Phụ kiện Thức ăn khô Thức ăn ướt Sức khỏe và Dinh dưỡ · `productFilterCategory`; lựa chọn: Tất cả danh mục, Thực phẩm, Đồ dùng, Vệ sinh, Phụ kiện, Thức ăn khô, Thức ăn ướt, Sức khỏe và Dinh dưỡng, Bát ăn và Đồ dùng
- [ ] L394 · **select** · Tất cả Sắp hết hàng Hết hàng Còn hàng · `productFilterStockStatus`; lựa chọn: Tất cả, Sắp hết hàng, Hết hàng, Còn hàng

#### subtab-tab-order-promos — 3
- [ ] L459 · **input / text** · Tìm mã voucher, tên chương trình khuyến mãi... · `promoSearchInput`
- [ ] L462 · **button** · Cấu hình Marketing và Banner · `class=admin-btn.admin-btn-secondary`
- [ ] L463 · **button** · Tạo mã khuyến mãi · `btnOpenCreateVoucherModal`

#### Khung chung / ngoài tab — 13
- [ ] L495 · **button** · Xem chi tiết đơn · `menuActionViewDetail`
- [ ] L496 · **button** · In phiếu đóng hàng · `menuActionPrintPack`
- [ ] L497 · **button** · Bàn giao vận chuyển · `menuActionShipOrder`
- [ ] L498 · **button** · Xác nhận thu tiền · `menuActionConfirmPayment`
- [ ] L499 · **button** · Đối soát tiền COD bưu cục · `menuActionReconcileCod`
- [ ] L500 · **button** · Đổi trả và hoàn tiền (RMA) · `menuActionReturnRefund`
- [ ] L501 · **button** · Hủy đơn hàng · `menuActionCancelOrder`
- [ ] L1936 · **button** · Xem và sửa chi tiết sản phẩm · `menuStockActionEdit`
- [ ] L1937 · **button** · Xem đánh giá của khách · `menuStockActionReviews`
- [ ] L1938 · **button** · Xem lịch sử biến động kho · `menuStockActionLogs`
- [ ] L1939 · **button** · Điều chỉnh số lượng tồn · `menuStockActionAdjust`
- [ ] L1940 · **button** · Tạo phiếu nhập hàng nhanh · `menuStockActionQuickGrn`
- [ ] L1941 · **button** · Đổi trạng thái kinh doanh · `menuStockActionToggleStatus`

#### modalCreateOrder — 25
- [ ] L516 · **button** · Đóng · `btnCloseCreateOrder`
- [ ] L527 · **button** · ✕ Bỏ chọn · `btnClearSelectedCustomer`
- [ ] L533 · **input / text** · Nhập SĐT khách hàng... · `createOrderPhone`
- [ ] L539 · **input / text** · Tên khách hàng (để trống nếu là khách lẻ)... · `createOrderName`
- [ ] L572 · **input / radio** · (không có nhãn hiển thị) · `radioAddrInStore`; thử cả hai trạng thái
- [ ] L579 · **input / radio** · (không có nhãn hiển thị) · `radioAddrDelivery`; thử cả hai trạng thái
- [ ] L585 · **input / text** · Nhập số nhà, tên đường, phường xã... · `createOrderCustomAddress`
- [ ] L589 · **input / checkbox** · Giao hỏa tốc 2 giờ (+25.000 đ) · `createOrderFastDelivery`; thử cả hai trạng thái
- [ ] L591 · **select** · Khung giờ: Trong ngày (08:00 - 18:00) Buổi sáng (08:00 - 12:00) Buổi chiều (14:00 - 18:00) Buổi · `createOrderDeliverySlot`; lựa chọn: Khung giờ: Trong ngày (08:00 - 18:00), Buổi sáng (08:00 - 12:00), Buổi chiều (14:00 - 18:00), Buổi tối (18:00 - 21:00)
- [ ] L609 · **input / text** · Tìm theo tên sản phẩm, mã SKU hoặc danh mục... · `createOrderProductSearchInput`
- [ ] L611 · **input / hidden** · (không có nhãn hiển thị) · `createOrderSelectedProductSku`
- [ ] L612 · **select** · -- Chọn mặt hàng từ kho -- · `createOrderProductSelect`; lựa chọn: -- Chọn mặt hàng từ kho --
- [ ] L616 · **input / number** · Số lượng · `createOrderQty`
- [ ] L617 · **button** · Thêm món · `btnPosAddToCart`
- [ ] L646 · **input / text** · Nhập mã hoặc tìm khuyến mãi... · `createOrderVoucherCode`
- [ ] L651 · **input / number** · Nhập số điểm muốn đổi... · `createOrderPointsInput`
- [ ] L658 · **select** · Tiền mặt tại quầy Quẹt thẻ ngân hàng POS Chuyển khoản QR code Giao hàng thu tiền COD · `createOrderPaymentMethod`; lựa chọn: Tiền mặt tại quầy, Quẹt thẻ ngân hàng POS, Chuyển khoản QR code, Giao hàng thu tiền COD
- [ ] L671 · **button** · Đủ tiền · `btnCashExact`
- [ ] L672 · **button** · +100k · `class=pos-cash-chip`
- [ ] L673 · **button** · +200k · `class=pos-cash-chip`
- [ ] L674 · **button** · +500k · `class=pos-cash-chip`
- [ ] L680 · **input / number** · Nhập số tiền... · `createOrderCashTendered`
- [ ] L719 · **input / text** · Ghi chú đóng gói hoặc giao hàng... · `createOrderNote`
- [ ] L724 · **button** · Hủy · `btnCancelCreateOrder`
- [ ] L725 · **button** · Tạo đơn và in hóa đơn · `btnSubmitCreateOrder`

#### modalPosReceipt — 3
- [ ] L738 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L805 · **button** · Đóng · `btnCancelPosReceipt`
- [ ] L806 · **button** · In hóa đơn K80 · `btnPrintPosReceipt`

#### modalShipOrder — 6
- [ ] L819 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L830 · **select** · J và T Express Giao hàng tiết kiệm GHTK Viettel Post Đội giao hỏa tốc PawPal · `shipCarrierSelect`; lựa chọn: J và T Express, Giao hàng tiết kiệm GHTK, Viettel Post, Đội giao hỏa tốc PawPal
- [ ] L840 · **input / text** · Ví dụ: JT8839201923... · `shipTrackingInput`
- [ ] L846 · **input / text** · Hàng dễ vỡ, liên hệ trước khi giao... · `shipCarrierNote`
- [ ] L851 · **button** · Hủy · `btnCancelShipOrder`
- [ ] L852 · **button** · Xác nhận giao hàng · `btnSubmitShipOrder`

#### modalCancelOrder — 5
- [ ] L865 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L881 · **select** · Khách hàng yêu cầu hủy đơn Hết hàng tồn kho đột xuất Không liên lạc được để xác nhận Khách đổi  · `cancelOrderReasonSelect`; lựa chọn: Khách hàng yêu cầu hủy đơn, Hết hàng tồn kho đột xuất, Không liên lạc được để xác nhận, Khách đổi địa chỉ hoặc thời gian nhận, Lý do khác
- [ ] L892 · **textarea** · Nhập thêm chi tiết... · `cancelOrderReasonDetail`
- [ ] L897 · **button** · Hủy · `btnCancelCancelOrder`
- [ ] L898 · **button** · Xác nhận hủy đơn · `btnSubmitCancelOrder`

#### modalPackingSlip — 3
- [ ] L912 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L920 · **button** · Đóng · `btnCancelPackingSlip`
- [ ] L921 · **button** · In phiếu đóng gói · `btnPrintSlipConfirm`

#### modalBatchDispatch — 6
- [ ] L935 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L948 · **select** · J và T Express Giao hàng tiết kiệm GHTK Viettel Post Đội giao hỏa tốc PawPal · `batchCarrierSelect`; lựa chọn: J và T Express, Giao hàng tiết kiệm GHTK, Viettel Post, Đội giao hỏa tốc PawPal
- [ ] L958 · **select** · Tự động phát sinh mã vận đơn bưu cục chuẩn Giữ nguyên mã đã có (chỉ cập nhật đơn vị vận chuyển) · `batchTrackingMode`; lựa chọn: Tự động phát sinh mã vận đơn bưu cục chuẩn, Giữ nguyên mã đã có (chỉ cập nhật đơn vị vận chuyển)
- [ ] L966 · **input / text** · Hàng thú cưng đóng hộp chuẩn, đã dán tem bảo đảm... · `batchCarrierNote`
- [ ] L971 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L972 · **button** · Xác nhận bàn giao bưu cục · `btnSubmitBatchDispatch`

#### modalDispatchManifest — 3
- [ ] L986 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L994 · **button** · Đóng · `class=admin-btn.admin-btn-secondary`
- [ ] L995 · **button** · In bảng kê · `btnPrintManifestConfirm`

#### modalReturnRefund — 10
- [ ] L1009 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1032 · **select** · Đổi hàng mới 1 đổi 1 miễn phí vận chuyển Trả hàng và hoàn tiền Gửi bù sản phẩm thiếu hoặc móp v · `rmaSolutionType`; lựa chọn: Đổi hàng mới 1 đổi 1 miễn phí vận chuyển, Trả hàng và hoàn tiền, Gửi bù sản phẩm thiếu hoặc móp vỡ
- [ ] L1041 · **select** · Hàng bị vỡ hoặc móp méo seal do vận chuyển Kho đóng gói gửi nhầm loại hoặc nhầm màu Sản phẩm cậ · `rmaReasonSelect`; lựa chọn: Hàng bị vỡ hoặc móp méo seal do vận chuyển, Kho đóng gói gửi nhầm loại hoặc nhầm màu, Sản phẩm cận date hoặc hết hạn sử dụng, Lỗi kỹ thuật hoặc chất lượng sản p
- [ ] L1077 · **input / radio** · Hàng còn nguyên seal - Nhập lại kho thương mại Hệ thống sẽ tự động cộng lại số lượng khả dụng v · `class=`; thử cả hai trạng thái
- [ ] L1084 · **input / radio** · Hàng rách vỡ hoặc hư hỏng - Chuyển hủy bỏ Hàng lỗi không nhập lại kho thương mại, lưu vào sổ sá · `class=`; thử cả hai trạng thái
- [ ] L1097 · **select** · Chuyển khoản ngân hàng trực tiếp Quy đổi sang điểm thưởng Pawpoint tương đương Hoàn tiền mặt tạ · `rmaRefundMethod`; lựa chọn: Chuyển khoản ngân hàng trực tiếp, Quy đổi sang điểm thưởng Pawpoint tương đương, Hoàn tiền mặt tại quầy chi nhánh
- [ ] L1105 · **input / number** · Số tiền hoàn... · `rmaRefundAmountInput`
- [ ] L1111 · **textarea** · Ghi chú chi tiết cho bộ phận CSKH và kho vận... · `rmaInternalNote`
- [ ] L1116 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1117 · **button** · Xác nhận phê duyệt RMA · `btnSubmitRmaTicket`

#### modalAdjustStock — 8
- [ ] L1132 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1154 · **select** · Nhập thêm hàng vào kho Xuất bớt hoặc hàng hư hỏng Kiểm kê đặt lại số thực tế · `adjustOperationType`; lựa chọn: Nhập thêm hàng vào kho, Xuất bớt hoặc hàng hư hỏng, Kiểm kê đặt lại số thực tế
- [ ] L1163 · **input / number** · (không có nhãn hiển thị) · `adjustQuantityInput`
- [ ] L1170 · **input / number** · Để trống nếu giữ nguyên · `adjustPriceInput`
- [ ] L1175 · **select** · Đang bán bình thường Tạm ngưng kinh doanh · `adjustStatusSelect`; lựa chọn: Đang bán bình thường, Tạm ngưng kinh doanh
- [ ] L1184 · **select** · Nhập hàng mới từ nhà cung cấp Kiểm kê định kỳ cân đối sổ sách Xuất hủy hàng lỗi bao bì rách vỡ  · `adjustReasonSelect`; lựa chọn: Nhập hàng mới từ nhà cung cấp, Kiểm kê định kỳ cân đối sổ sách, Xuất hủy hàng lỗi bao bì rách vỡ, Điều chuyển nội bộ sang chi nhánh khác
- [ ] L1194 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1195 · **button** · Lưu cập nhật tồn kho · `btnSubmitAdjustStock`

#### modalAddProduct — 41
- [ ] L1213 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1222 · **input / hidden** · (không có nhãn hiển thị) · `newProdStt`
- [ ] L1224 · **input / text** · Ví dụ: TP-PATE-15 · `newProdSku`
- [ ] L1228 · **input / text** · Nhập tên sản phẩm... · `newProdName`
- [ ] L1235 · **select** · Thức ăn khô Thức ăn ướt Xương gặm và Bánh thưởng Sức khỏe và Dinh dưỡng Bát ăn và Bình nước Đồ  · `newProdCategory`; lựa chọn: Thức ăn khô, Thức ăn ướt, Xương gặm và Bánh thưởng, Sức khỏe và Dinh dưỡng, Bát ăn và Bình nước, Đồ chơi và Huấn luyện, Vệ sinh và Chăm sóc, Thời trang và Dây d
- [ ] L1250 · **input / text** · Royal Canin, King's Pet, PawPal... · `newProdBrand`
- [ ] L1254 · **select** · Chó và Mèo Chó Mèo Hamster Thỏ và Bọ ú Thú nhỏ Tất cả bé cưng · `newProdPetType`; lựa chọn: Chó và Mèo, Chó, Mèo, Hamster, Thỏ và Bọ ú, Thú nhỏ, Tất cả bé cưng
- [ ] L1269 · **input / text** · Việt Nam, Pháp, Mỹ... · `newProdOrigin`
- [ ] L1273 · **select** · Không có nhãn Bán chạy Mới Khuyên dùng Đề xuất Cao cấp Phổ biến Ưu đãi · `newProdBadge`; lựa chọn: Không có nhãn, Bán chạy, Mới, Khuyên dùng, Đề xuất, Cao cấp, Phổ biến, Ưu đãi
- [ ] L1286 · **select** · Còn hàng Sắp hết hàng Hết hàng Tạm ngưng · `newProdStatus`; lựa chọn: Còn hàng, Sắp hết hàng, Hết hàng, Tạm ngưng
- [ ] L1302 · **input / radio** · Sản phẩm đơn · `class=`; thử cả hai trạng thái
- [ ] L1306 · **input / radio** · Nhiều phân loại · `class=`; thử cả hai trạng thái
- [ ] L1317 · **select** · Túi Lon Hộp Gói Chai Tuýp Cái Chiếc Bộ Khay · `newProdUnit`; lựa chọn: Túi, Lon, Hộp, Gói, Chai, Tuýp, Cái, Chiếc, Bộ, Khay
- [ ] L1332 · **input / text** · Ví dụ: Lon 180g, Túi 2kg... · `newProdSpec`
- [ ] L1340 · **input / number** · Ví dụ: 95000 · `newProdCostPrice`
- [ ] L1344 · **input / number** · Ví dụ: 150000 · `newProdPrice`
- [ ] L1348 · **input / number** · Ví dụ: 180000 (Hiện gạch) · `newProdOriginalPrice`
- [ ] L1355 · **input / number** · (không có nhãn hiển thị) · `newProdInitialStock`
- [ ] L1359 · **input / number** · (không có nhãn hiển thị) · `newProdMinStock`
- [ ] L1366 · **input / text** · Nhập đường dẫn URL ảnh, phân cách bằng dấu phẩy... · `newProdImages`
- [ ] L1385 · **input / text** · Tên nhóm (ví dụ: Hương vị) · `attr1Name`
- [ ] L1388 · **input / text** · Nhập giá trị rồi nhấn Enter hoặc phẩy (,)... · `attr1TagInput`
- [ ] L1400 · **input / text** · Tên nhóm (ví dụ: Quy cách) · `attr2Name`
- [ ] L1403 · **input / text** · Nhập giá trị rồi nhấn Enter hoặc phẩy (,)... · `attr2TagInput`
- [ ] L1411 · **input / number** · Giá vốn · `bulkCostPrice`
- [ ] L1412 · **input / number** · Giá bán * · `bulkPrice`
- [ ] L1413 · **input / number** · Giá gốc · `bulkOriginalPrice`
- [ ] L1414 · **input / number** · Tồn kho · `bulkStock`
- [ ] L1415 · **input / text** · URL ảnh chung · `bulkImage`
- [ ] L1416 · **button** · Áp dụng · `class=admin-btn.admin-btn-secondary`
- [ ] L1449 · **input / text** · Ví dụ: Không ngũ cốc, giàu Omega 3... · `newProdFeatures`
- [ ] L1454 · **textarea** · Mô tả tổng quan công năng và trải nghiệm sản phẩm... · `newProdDescription`
- [ ] L1459 · **textarea** · Thịt cá tươi, phụ gia an toàn hoặc chất liệu cấu thành... · `newProdIngredients`
- [ ] L1465 · **textarea** · Lợi ích nuôi dưỡng lông da, hỗ trợ tiêu hóa... · `newProdBenefits`
- [ ] L1469 · **textarea** · Cách dùng, tần suất sử dụng hoặc khẩu phần ăn... · `newProdUsage`
- [ ] L1475 · **input / text** · Ví dụ: Bé 1-3kg: 30-55g/ngày; Bé 3-5kg: 55-85g/ngày... · `newProdFeedingGuide`
- [ ] L1481 · **input / text** · Ví dụ: 24 tháng kể từ ngày sản xuất · `newProdExpiry`
- [ ] L1485 · **input / text** · Ví dụ: Nơi khô ráo, thoáng mát, tránh ánh nắng; ngăn mát 2-6°C sau mở nắp · `newProdStorage`
- [ ] L1492 · **input / hidden** · (không có nhãn hiển thị) · `editProductOriginalSku`
- [ ] L1493 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1494 · **button** · Lưu sản phẩm · `btnSubmitAddProduct`

#### modalCreateVoucher — 10
- [ ] L1509 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1516 · **input / text** · Ví dụ: PAWSUMMER20... · `newVoucherCode`
- [ ] L1520 · **input / text** · Ưu đãi hè rực rỡ... · `newVoucherTitle`
- [ ] L1527 · **input / text** · Ví dụ: 20% (Tối đa 50k) hoặc 30.000 đ · `newVoucherDiscount`
- [ ] L1531 · **input / text** · Ví dụ: 250.000 đ · `newVoucherMinOrder`
- [ ] L1538 · **input / text** · Miễn phí hoặc 500 điểm · `newVoucherPoints`
- [ ] L1542 · **input / text** · Ngày hết hạn... · `newVoucherExpiry`
- [ ] L1548 · **input / number** · (không có nhãn hiển thị) · `newVoucherMaxUses`
- [ ] L1553 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1554 · **button** · Kích hoạt mã khuyến mãi · `btnSubmitCreateVoucher`

#### modalVoucherAction — 5
- [ ] L1569 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1591 · **select** · Đang chạy Tạm ngưng Hết hạn · `voucherTargetStatus`; lựa chọn: Đang chạy, Tạm ngưng, Hết hạn
- [ ] L1600 · **input / text** · Ví dụ: 31/12/2026 · `voucherTargetExpiry`
- [ ] L1606 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1607 · **button** · Lưu thay đổi · `btnSubmitUpdateVoucher`

#### modalStockLogs — 3
- [ ] L1624 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1664 · **button** · Đóng · `class=admin-btn.admin-btn-secondary`
- [ ] L1665 · **button** · Điều chỉnh tồn kho · `class=admin-btn.admin-btn-primary`

#### modalGoodsReceipt — 10
- [ ] L1679 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1686 · **input / text** · (không có nhãn hiển thị) · `grnReceiptCode`
- [ ] L1690 · **select** · Công ty TNHH Royal Canin Việt Nam Công ty CP King's Pet Việt Nam Inaba Petfood Japan (Nhập khẩu · `grnSupplierSelect`; lựa chọn: Công ty TNHH Royal Canin Việt Nam, Công ty CP King's Pet Việt Nam, Inaba Petfood Japan (Nhập khẩu Ciao), Petkit Smart Living Distributor, Virbac Animal Health V
- [ ] L1704 · **input / text** · Ví dụ: HD-RC-2026-9921... · `grnInvoiceNo`
- [ ] L1708 · **input / text** · (không có nhãn hiển thị) · `grnWarehouseLocation`
- [ ] L1716 · **select** · (không có nhãn hiển thị) · `grnProductPicker`
- [ ] L1719 · **button** · Thêm dòng · `btnGrnAddItem`
- [ ] L1755 · **input / text** · Ví dụ: Lô hàng nhập bổ sung định kỳ tháng 6, hàng nguyên đai nguyên kiện... · `grnNoteInput`
- [ ] L1760 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1761 · **button** · Xác nhận nhập kho và cộng tồn · `btnSubmitGoodsReceipt`

#### modalStocktake — 5
- [ ] L1776 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1783 · **input / text** · (không có nhãn hiển thị) · `stkAuditCode`
- [ ] L1787 · **select** · Kiểm kê định kỳ tháng 06/2026 Kiểm kê đột xuất khu vực hàng bán chạy Bàn giao ca quản lý kho vậ · `stkReasonSelect`; lựa chọn: Kiểm kê định kỳ tháng 06/2026, Kiểm kê đột xuất khu vực hàng bán chạy, Bàn giao ca quản lý kho vận
- [ ] L1824 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1825 · **button** · Cân đối và cập nhật kho · `btnSubmitStocktake`

#### modalConfirmToggleProductStatus — 3
- [ ] L1842 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1867 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1868 · **button** · Xác nhận chuyển trạng thái · `btnConfirmToggleProductStatus`

#### modalConfirmOrderAction — 3
- [ ] L1881 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1889 · **button** · Hủy · `btnCancelOrderConfirm`
- [ ] L1890 · **button** · Đồng ý · `btnAcceptOrderConfirm`

#### modalProductReviews — 3
- [ ] L1903 · **button** · Đóng · `class=modal-btn-close-text`
- [ ] L1926 · **button** · Đóng · `class=admin-btn.admin-btn-secondary`
- [ ] L1927 · **button** · Xem trên gian hàng trực tuyến · `btnOpenStorefrontProductDetail`

### pages/admin/modules/pets/pets.html — 129 điều khiển

#### subtab-tab-pet-list — 12
- [ ] L36 · **input / text** · Tìm tên bé, Mã PET, giống loài, tên chủ, SĐT... · `petSearchInput`
- [ ] L40 · **button** · Xuất file · `btnExportPetReport`
- [ ] L41 · **button** · Thêm bé cưng · `btnOpenAddPetModal`
- [ ] L48 · **select** · Tất cả Chó Mèo Thỏ Khác · `petFilterSpecies`; lựa chọn: Tất cả, Chó, Mèo, Thỏ, Khác
- [ ] L59 · **select** · Tất cả Corgi Poodle Golden Retriever Mèo Anh lông ngắn Mèo ta Phốc sóc · `petFilterBreed`; lựa chọn: Tất cả, Corgi, Poodle, Golden Retriever, Mèo Anh lông ngắn, Mèo ta, Phốc sóc
- [ ] L72 · **select** · Tất cả Dưới 5kg 5 - 10kg 10 - 20kg Trên 20kg · `petFilterWeight`; lựa chọn: Tất cả, Dưới 5kg, 5 - 10kg, 10 - 20kg, Trên 20kg
- [ ] L83 · **select** · Tất cả Đã tiêm đủ Chưa xác nhận · `petFilterVaccine`; lựa chọn: Tất cả, Đã tiêm đủ, Chưa xác nhận
- [ ] L90 · **button** · Đang ở Hotel · `btnFilterHotelOnly`
- [ ] L92 · **button** · Có cảnh báo · `btnFilterAlertOnly`
- [ ] L93 · **button** · Xóa bộ lọc · `btnPetClearFilters`
- [ ] L154 · **button** · Trang trước · `petPrevPageBtn`
- [ ] L156 · **button** · Trang sau · `petNextPageBtn`

#### subtab-tab-pet-profile — 14
- [ ] L178 · **a** · Đang tải... · `drawerPetOwnerLink`
- [ ] L184 · **button** · Đặt lịch Spa hoặc Hotel · `class=action-btn-pill.btn-primary-pill`
- [ ] L185 · **button** · Cân bé và Thể trạng · `btnDrawerWeighPet`
- [ ] L186 · **button** · Đăng ảnh nhật ký · `class=action-btn-pill.btn-quick-carelog`
- [ ] L187 · **button** · Xem chủ nuôi · `btnDrawerJumpCustomer`; kiểm tra điều kiện kích hoạt
- [ ] L199 · **button** · Thể trạng và Đặc tính · `class=drawer-tab-btn.active`
- [ ] L200 · **button** · Xác nhận tiêm chủng ! · `class=drawer-tab-btn`
- [ ] L204 · **button** · Nhật ký chăm sóc 0 · `class=drawer-tab-btn`
- [ ] L208 · **button** · Lịch sử dịch vụ · `class=drawer-tab-btn`
- [ ] L223 · **button** · Sửa hồ sơ · `btnOpenEditPetModal`
- [ ] L239 · **button** · Cân bé · `class=admin-btn.admin-btn-secondary`
- [ ] L262 · **textarea** · (không có nhãn hiển thị) · `petGroomerNotes`
- [ ] L264 · **button** · Lưu ghi chú · `btnSaveGroomerNotes`
- [ ] L278 · **button** · Ghi nhận tiêm chủng hoặc xổ giun · `btnOpenAddVaccineModal`

#### subtab-tab-pet-carelog — 1
- [ ] L338 · **input / text** · Tìm bé cưng, chủ nuôi hoặc nội dung · `petCarelogSearch`

#### subtab-tab-pet-reminders — 6
- [ ] L377 · **input / text** · Tìm tên bé cưng, tên chủ nuôi, SĐT... · `reminderSearchInput`
- [ ] L380 · **button** · Gửi tin đồng loạt Zalo · `btnBatchSendReminder`
- [ ] L387 · **select** · Tất cả Tắm sấy định kỳ (quá 14 ngày) Cắt tỉa tạo kiểu lông (quá 30 ngày) Gửi Pet Hotel cuối tuầ · `reminderFilterType`; lựa chọn: Tất cả, Tắm sấy định kỳ (quá 14 ngày), Cắt tỉa tạo kiểu lông (quá 30 ngày), Gửi Pet Hotel cuối tuần, Cảnh báo sổ tiêm ngoài cho Hotel, Mua lại thức ăn và Cát vệ
- [ ] L399 · **select** · Tất cả Chưa gửi Đã gửi tin · `reminderFilterStatus`; lựa chọn: Tất cả, Chưa gửi, Đã gửi tin
- [ ] L429 · **button** · Trang trước · `remPrevPageBtn`
- [ ] L431 · **button** · Trang sau · `remNextPageBtn`

#### modalAddPet — 16
- [ ] L443 · **button** · Đóng · `class=btn-modal-close`
- [ ] L451 · **button** · Thêm nhanh chủ nuôi · `btnOpenQuickAddOwnerModal`
- [ ] L454 · **input / text** · Nhập số điện thoại hoặc họ tên để tìm nhanh... · `newPetOwnerInput`
- [ ] L455 · **input / hidden** · (không có nhãn hiển thị) · `newPetOwner`
- [ ] L464 · **input / text** · Ví dụ: Milu, Đậu Đậu... · `newPetName`
- [ ] L468 · **select** · Chó Mèo Thỏ Khác · `newPetSpecies`; lựa chọn: Chó, Mèo, Thỏ, Khác
- [ ] L481 · **input / text** · Ví dụ: Corgi, Poodle, Mèo ALN... · `newPetBreed`
- [ ] L487 · **select** · Đực Cái · `newPetGender`; lựa chọn: Đực, Cái
- [ ] L497 · **input / number** · Ví dụ: 6.5 · `newPetWeight`
- [ ] L501 · **input / date** · (không có nhãn hiển thị) · `newPetDob`
- [ ] L509 · **input / text** · Ví dụ: Vàng trắng, Xám khói... · `newPetColor`
- [ ] L515 · **select** · Đã tiêm đủ dại và bệnh truyền nhiễm Chưa xác nhận tiêm · `newPetVaccinated`; lựa chọn: Đã tiêm đủ dại và bệnh truyền nhiễm, Chưa xác nhận tiêm
- [ ] L524 · **input / text** · Ví dụ: Cắn khi chạm đuôi, sợ sấy lớn... · `newPetAlert`
- [ ] L529 · **input / text** · Ví dụ: Dị ứng tinh dầu tràm, dị ứng hải sản... · `newPetAllergy`
- [ ] L533 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L534 · **button** · Lưu bé cưng · `btnSubmitAddPet`

#### modalWeighPet — 11
- [ ] L547 · **button** · Đóng · `class=btn-modal-close`
- [ ] L554 · **input / text** · (không có nhãn hiển thị) · `weighPetName`
- [ ] L558 · **input / text** · (không có nhãn hiển thị) · `weighPetOldWeight`
- [ ] L564 · **input / number** · (không có nhãn hiển thị) · `weighPetNewWeight`
- [ ] L569 · **input / text** · Ví dụ: Cân định kỳ hàng tháng, kiểm tra trước khi làm spa... · `weighPetNote`
- [ ] L571 · **button** · Cân định kỳ · `class=reason-quick-chip`
- [ ] L572 · **button** · Trước khi tắm spa · `class=reason-quick-chip`
- [ ] L573 · **button** · Kiểm tra vào hotel · `class=reason-quick-chip`
- [ ] L574 · **button** · Sau đợt điều trị · `class=reason-quick-chip`
- [ ] L602 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L603 · **button** · Lưu cân nặng · `btnSubmitWeigh`

#### modalSendReminder — 11
- [ ] L616 · **button** · Đóng · `class=btn-modal-close`
- [ ] L623 · **input / text** · (không có nhãn hiển thị) · `reminderModalOwner`
- [ ] L627 · **input / text** · (không có nhãn hiển thị) · `reminderModalPet`
- [ ] L633 · **select** · Mẫu 1: Nhắc tắm sấy và vệ sinh định kỳ (Tặng voucher 10% Spa) Mẫu 2: Nhắc cắt tỉa tạo kiểu lông · `reminderTemplateSelect`; lựa chọn: Mẫu 1: Nhắc tắm sấy và vệ sinh định kỳ (Tặng voucher 10% Spa), Mẫu 2: Nhắc cắt tỉa tạo kiểu lông (Chải lông xả rối và cắt móng), Mẫu 3: Mời đặt trước phòng Pet 
- [ ] L646 · **input / radio** · Zalo ZNS và Official Account · `class=`; thử cả hai trạng thái
- [ ] L650 · **input / radio** · SMS Brandname PawPal · `class=`; thử cả hai trạng thái
- [ ] L659 · **button** · Sao chép nội dung · `btnCopyReminderText`
- [ ] L661 · **textarea** · PawPal mến chào Sen Nguyễn Văn An! Bé Milu đã hơn 2 tuần chưa ghé spa làm đẹp rồi đó ạ. PawPal  · `reminderMessageContent`
- [ ] L666 · **a** · Mở Zalo nhắn Sen · `btnOpenZaloChat`
- [ ] L669 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L670 · **button** · Gửi tin nhắn · `btnSubmitSendReminder`

#### modalViewCareLogDetail — 2
- [ ] L684 · **button** · Đóng · `class=btn-modal-close`
- [ ] L754 · **button** · Đóng · `class=admin-btn.admin-btn-secondary`

#### modalEditPetProfile — 17
- [ ] L767 · **button** · Đóng · `class=btn-modal-close`
- [ ] L771 · **input / hidden** · (không có nhãn hiển thị) · `editPetCode`
- [ ] L776 · **input / text** · Nhập số điện thoại hoặc họ tên để tìm nhanh... · `editPetOwnerInput`
- [ ] L777 · **input / hidden** · (không có nhãn hiển thị) · `editPetOwner`
- [ ] L786 · **input / text** · Tên bé cưng... · `editPetName`
- [ ] L790 · **select** · Chó Mèo Thỏ Khác · `editPetSpecies`; lựa chọn: Chó, Mèo, Thỏ, Khác
- [ ] L803 · **input / text** · Ví dụ: Corgi, Poodle... · `editPetBreed`
- [ ] L809 · **select** · Đực Cái · `editPetGender`; lựa chọn: Đực, Cái
- [ ] L819 · **input / number** · Ví dụ: 8.5 · `editPetWeight`
- [ ] L823 · **input / date** · (không có nhãn hiển thị) · `editPetDob`
- [ ] L831 · **input / text** · Ví dụ: Vàng trắng, Xám tro... · `editPetColor`
- [ ] L837 · **select** · Đang nuôi Lưu trú Hotel Lưu trữ · `editPetStatus`; lựa chọn: Đang nuôi, Lưu trú Hotel, Lưu trữ
- [ ] L847 · **input / text** · Ví dụ: Bé hay cắn khi chạm đuôi... · `editPetAlert`
- [ ] L852 · **input / text** · Ví dụ: Dị ứng tinh dầu tràm, hải sản... · `editPetAllergy`
- [ ] L857 · **textarea** · Ghi chú sở thích, tính cách bé cưng... · `editPetNotes`
- [ ] L861 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L862 · **button** · Lưu thay đổi · `btnSubmitEditPetProfile`

#### modalQuickAddOwner — 7
- [ ] L875 · **button** · Đóng · `class=btn-modal-close`
- [ ] L880 · **input / text** · Ví dụ: Hoàng Mai Ly · `quickOwnerName`
- [ ] L885 · **input / tel** · Ví dụ: 0988112233 · `quickOwnerPhone`
- [ ] L889 · **select** · Khách mới Hạng Đồng Hạng Bạc Hạng Vàng · `quickOwnerTier`; lựa chọn: Khách mới, Hạng Đồng, Hạng Bạc, Hạng Vàng
- [ ] L899 · **input / text** · Ví dụ: 45 Lê Duẩn, Bến Nghé, Quận 1 · `quickOwnerAddress`
- [ ] L902 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L903 · **button** · Lưu chủ nuôi · `btnSubmitQuickAddOwner`

#### modalCollarTagPreview — 3
- [ ] L916 · **button** · Đóng · `class=btn-modal-close`
- [ ] L971 · **button** · Đóng · `class=admin-btn.admin-btn-secondary`
- [ ] L972 · **button** · In thẻ đeo cổ · `btnConfirmSendPrintCollar`

#### modalAddVaccine — 12
- [ ] L984 · **button** · Đóng · `class=btn-modal-close`
- [ ] L989 · **select** · Vắc-xin phòng dại Vắc-xin 7 bệnh cho chó Vắc-xin 4 bệnh cho mèo Xổ giun định kỳ và nhỏ gáy ve r · `newVaccineType`; lựa chọn: Vắc-xin phòng dại, Vắc-xin 7 bệnh cho chó, Vắc-xin 4 bệnh cho mèo, Xổ giun định kỳ và nhỏ gáy ve rận, Tiêm phòng nấm da và ghẻ, Khác
- [ ] L1000 · **input / text** · Ví dụ: Vắc-xin Ho cũi chó... · `newCustomVaccineName`
- [ ] L1005 · **input / date** · (không có nhãn hiển thị) · `newVaccineDate`
- [ ] L1009 · **input / date** · (không có nhãn hiển thị) · `newVaccineNextDate`
- [ ] L1015 · **input / text** · Ví dụ: Sổ tiêm đối chiếu, PK Thú y 24/7... · `newVaccinePlace`
- [ ] L1017 · **button** · Sổ tiêm đối chiếu · `class=reason-quick-chip`
- [ ] L1018 · **button** · PK Thú y 24/7 · `class=reason-quick-chip`
- [ ] L1019 · **button** · Bệnh viện PetCare · `class=reason-quick-chip`
- [ ] L1024 · **select** · Đã tiêm đủ Đã thực hiện Đạt chuẩn Sắp đến hạn · `newVaccineStatus`; lựa chọn: Đã tiêm đủ, Đã thực hiện, Đạt chuẩn, Sắp đến hạn
- [ ] L1033 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`
- [ ] L1034 · **button** · Lưu sổ tiêm · `btnSubmitAddVaccine`

#### modalPreviewAppDiary — 10
- [ ] L1051 · **button** · Đóng · `class=btn-modal-close`
- [ ] L1166 · **button** · Yêu thích (1) · `class=preview-btn-story-like`
- [ ] L1170 · **button** · Nhắn dặn dò · `class=preview-btn-story-message`
- [ ] L1205 · **button** · Yêu thích (2) · `class=preview-btn-story-like`
- [ ] L1209 · **button** · Nhắn dặn dò · `class=preview-btn-story-message`
- [ ] L1244 · **button** · Yêu thích (3) · `class=preview-btn-story-like`
- [ ] L1248 · **button** · Nhắn dặn dò · `class=preview-btn-story-message`
- [ ] L1321 · **textarea** · Chia sẻ cảm nhận của bạn về trải nghiệm của bé tại PawPal... · `class=preview-review-textarea`
- [ ] L1323 · **button** · Gửi đánh giá · `class=preview-btn-submit-review`
- [ ] L1332 · **button** · Đóng · `class=admin-btn.admin-btn-secondary`

#### modalSelectPhoto — 4
- [ ] L1344 · **button** · Đóng · `class=btn-modal-close`
- [ ] L1352 · **input / file** · (không có nhãn hiển thị) · `petPhotoFileInput`
- [ ] L1353 · **button** · Tải ảnh từ thiết bị · `btnUploadPetPhoto`
- [ ] L1358 · **button** · Hủy · `class=admin-btn.admin-btn-secondary`

#### modalConfirmPetAction — 3
- [ ] L1370 · **button** · Đóng · `btnCloseConfirmPetModal`
- [ ] L1376 · **button** · Hủy · `btnCancelPetConfirm`
- [ ] L1377 · **button** · Đồng ý · `btnAcceptPetConfirm`

### pages/admin/modules/services/services.html — 237 điều khiển

#### subtab-tab-service-bookings — 13
- [ ] L46 · **button** · Lọc danh sách · `btnFilterUpcomingQuick`
- [ ] L54 · **input / text** · Tìm mã BKG, tên khách, số điện thoại, tên thú cưng... · `serviceSearchInput`
- [ ] L55 · **button** · Xóa nội dung tìm kiếm · `btnToolbarResetFilters`
- [ ] L58 · **button** · Lịch trực KTV · `btnOpenStaffScheduleModal`
- [ ] L59 · **button** · Xuất file · `btnExportServiceReport`
- [ ] L60 · **button** · Thêm lịch hẹn · `btnOpenCreateBookingModal`
- [ ] L67 · **select** · Tất cả Spa và Grooming Pet Hotel Pet Taxi · `serviceFilterCategory`; lựa chọn: Tất cả, Spa và Grooming, Pet Hotel, Pet Taxi
- [ ] L77 · **select** · Tất cả Chờ xác nhận Đã xác nhận Đang thực hiện Hoàn thành Đã hủy · `serviceFilterStatus`; lựa chọn: Tất cả, Chờ xác nhận, Đã xác nhận, Đang thực hiện, Hoàn thành, Đã hủy
- [ ] L89 · **select** · Tất cả KTV Chưa phân công · `serviceFilterStaff`; lựa chọn: Tất cả KTV, Chưa phân công
- [ ] L95 · **button** · Lịch hẹn sắp tới · `btnToggleUpcomingOnly`
- [ ] L96 · **button** · Pet có lưu ý · `btnToggleAllergyOnly`
- [ ] L97 · **button** · Quá hạn SLA và Trễ ca · `btnToggleSlaOverdue`
- [ ] L98 · **button** · Xóa bộ lọc · `btnServiceClearFilters`

#### subtab-tab-service-detail — 16
- [ ] L196 · **button** · Đổi KTV · `btnDetailQuickChangeStaff`
- [ ] L232 · **a** · Lê Lệ Quyên · `detailCustomerName`
- [ ] L240 · **a** · Miu Con · `detailPetName`
- [ ] L266 · **button** · In biên bản tiếp nhận · `btnPrintIntakeWaiver`
- [ ] L267 · **button** · Sửa biên bản tiếp nhận · `btnEditIntakeSafety`
- [ ] L323 · **button** · Thanh toán tại POS · `btnSettleToPos`
- [ ] L324 · **button** · Thêm dịch vụ đi cùng · `btnOpenAddAccompanyingServiceModal`
- [ ] L325 · **button** · Thêm phụ phí · `btnOpenAddSurchargeModal`
- [ ] L366 · **button** · Báo khách đón bé · `btnNotifyCustomerPickup`
- [ ] L367 · **button** · Chia sẻ cho khách · `btnShareCarelogLink`
- [ ] L384 · **input / text** · Tên bước (VD: Sấy tạo phồng)... · `newLogStepTitle`
- [ ] L385 · **select** · -- Chọn KTV thực hiện -- · `newLogStepStaff`; lựa chọn: -- Chọn KTV thực hiện --
- [ ] L389 · **input / text** · Ghi chú chi tiết cho chủ nuôi... · `newLogStepNote`
- [ ] L393 · **input / file** · (không có nhãn hiển thị) · `carelogImageFileInput`
- [ ] L395 · **button** · Đính kèm ảnh thực tế · `btnTriggerCarelogImageUpload`
- [ ] L402 · **button** · Ghi nhật ký · `btnSubmitCarelogStep`

#### subtab-tab-service-catalog — 6
- [ ] L420 · **button** · Spa và Grooming · `class=catalog-tab-btn.active`
- [ ] L421 · **button** · Pet Hotel · `class=catalog-tab-btn`
- [ ] L422 · **button** · Pet Taxi · `class=catalog-tab-btn`
- [ ] L425 · **button** · Thêm dịch vụ · `btnOpenCreateServiceModal`
- [ ] L430 · **input / text** · Tìm theo mã hoặc tên dịch vụ... · `catalogSearchInput`
- [ ] L434 · **select** · Tất cả trạng thái Đang phục vụ Tạm ẩn · `catalogFilterStatus`; lựa chọn: Tất cả trạng thái, Đang phục vụ, Tạm ẩn

#### subtab-tab-service-reviews — 6
- [ ] L498 · **input / text** · Tìm tên khách, số điện thoại, mã ca, từ khóa đánh giá... · `reviewSearchInput`
- [ ] L501 · **button** · Xuất file báo cáo · `btnExportReviewReport`
- [ ] L507 · **select** · Tất cả sao 5 sao (Xuất sắc) 4 sao (Tốt) 3 sao (Trung bình) 1-2 sao (Cần xử lý) · `reviewFilterStar`; lựa chọn: Tất cả sao, 5 sao (Xuất sắc), 4 sao (Tốt), 3 sao (Trung bình), 1-2 sao (Cần xử lý)
- [ ] L517 · **select** · Tất cả dịch vụ Spa và Grooming Pet Hotel Pet Taxi · `reviewFilterCategory`; lựa chọn: Tất cả dịch vụ, Spa và Grooming, Pet Hotel, Pet Taxi
- [ ] L526 · **select** · Tất cả KTV · `reviewFilterStaff`; lựa chọn: Tất cả KTV
- [ ] L532 · **select** · Tất cả Chưa phản hồi Đã phản hồi Đã chuyển CSKH · `reviewFilterStatus`; lựa chọn: Tất cả, Chưa phản hồi, Đã phản hồi, Đã chuyển CSKH

#### modalCreateBooking — 34
- [ ] L575 · **button** · Đóng · `btnCloseCreateBooking`
- [ ] L581 · **input / text** · Nhập tên hoặc số điện thoại khách... · `newBookingCustomer`
- [ ] L590 · **input / text** · 0901234567... · `newBookingPhone`
- [ ] L596 · **input / text** · Tên bé cưng... · `newBookingPetName`
- [ ] L606 · **select** · Spa và Grooming Pet Hotel Pet Taxi · `newBookingCategory`; lựa chọn: Spa và Grooming, Pet Hotel, Pet Taxi
- [ ] L616 · **input / text** · Tìm hoặc chọn gói dịch vụ... · `newBookingServiceInput`
- [ ] L617 · **input / hidden** · (không có nhãn hiển thị) · `newBookingServiceSelect`
- [ ] L627 · **input / date** · (không có nhãn hiển thị) · `newBookingDate`
- [ ] L632 · **input / time** · (không có nhãn hiển thị) · `newBookingTime`
- [ ] L642 · **input / date** · (không có nhãn hiển thị) · `newBookingHotelCheckOutDate`
- [ ] L647 · **input / time** · (không có nhãn hiển thị) · `newBookingHotelCheckOutTime`
- [ ] L653 · **select** · Phòng Standard (STD-01) Phòng Deluxe (DLX-04 - Máy lạnh 24/7) Phòng VIP Penthouse (VIP-02 - Cam · `newBookingHotelRoomType`; lựa chọn: Phòng Standard (STD-01), Phòng Deluxe (DLX-04 - Máy lạnh 24/7), Phòng VIP Penthouse (VIP-02 - Camera riêng)
- [ ] L661 · **select** · Pate tươi dinh dưỡng (2 bữa/ngày) Hạt cao cấp Royal Canin (2 bữa/ngày) Thức ăn riêng chủ nuôi t · `newBookingHotelDiet`; lựa chọn: Pate tươi dinh dưỡng (2 bữa/ngày), Hạt cao cấp Royal Canin (2 bữa/ngày), Thức ăn riêng chủ nuôi tự gửi
- [ ] L675 · **input / text** · Nhập địa chỉ đón bé (Số nhà, đường, phường, quận)... · `newBookingTaxiPickup`
- [ ] L680 · **input / text** · Nhập địa chỉ trả (Mặc định: PawPal Chi nhánh Quận 1)... · `newBookingTaxiDropoff`
- [ ] L685 · **select** · 2 chiều khứ hồi (Đón đến và Chở về) 1 chiều (Đón đến quầy) 1 chiều (Chở về nhà) · `newBookingTaxiTripType`; lựa chọn: 2 chiều khứ hồi (Đón đến và Chở về), 1 chiều (Đón đến quầy), 1 chiều (Chở về nhà)
- [ ] L693 · **input / number** · 4.0 · `newBookingTaxiDistance`
- [ ] L704 · **input / text** · VD: Mặt tròn Boo, bo 4 chân phồng, tỉa form Poodle... · `newBookingSpaStyle`
- [ ] L708 · **select** · Senior Groomer Master Groomer Junior Groomer · `newBookingSpaGroomerLevel`; lựa chọn: Senior Groomer, Master Groomer, Junior Groomer
- [ ] L720 · **select** · Chưa phân công (Phân công sau) · `newBookingStaff`; lựa chọn: Chưa phân công (Phân công sau)
- [ ] L727 · **select** · PawPal Chi nhánh Quận 1 PawPal Chi nhánh Quận 10 · `newBookingBranch`; lựa chọn: PawPal Chi nhánh Quận 1, PawPal Chi nhánh Quận 10
- [ ] L735 · **input / text** · Ví dụ: Dị ứng xà phòng thơm, nhát nước, cắn khi chạm đuôi... · `newBookingPetAlert`
- [ ] L737 · **button** · Nhát nước · `class=reason-quick-chip`
- [ ] L738 · **button** · Sợ tiếng máy sấy · `class=reason-quick-chip`
- [ ] L739 · **button** · Dị ứng xà phòng thơm · `class=reason-quick-chip`
- [ ] L740 · **button** · Cắn khi chạm chân sau · `class=reason-quick-chip`
- [ ] L741 · **button** · Bé lớn tuổi cần nhẹ tay · `class=reason-quick-chip`
- [ ] L746 · **textarea** · Yêu cầu riêng của khách hàng... · `newBookingNotes`
- [ ] L748 · **button** · Khách đón trước 17h · `class=reason-quick-chip`
- [ ] L749 · **button** · Tỉa tròn mặt Boo · `class=reason-quick-chip`
- [ ] L750 · **button** · Giữ lại độ dài lông đuôi · `class=reason-quick-chip`
- [ ] L751 · **button** · Chụp nhiều ảnh gửi Zalo · `class=reason-quick-chip`
- [ ] L755 · **button** · Hủy · `btnCancelCreateBooking`
- [ ] L756 · **button** · Lưu lịch hẹn · `btnSubmitCreateBooking`

#### modalServiceForm — 21
- [ ] L769 · **button** · Đóng · `btnCloseServiceForm`
- [ ] L772 · **input / hidden** · (không có nhãn hiển thị) · `editServiceCodeHidden`
- [ ] L776 · **input / text** · VD: SPA15, HTL09... · `formServiceId`
- [ ] L780 · **select** · Spa và Grooming Pet Hotel Pet Taxi · `formServiceGroup`; lựa chọn: Spa và Grooming, Pet Hotel, Pet Taxi
- [ ] L789 · **input / text** · VD: Gói Tắm Trị Liệu Thảo Dược... · `formServiceName`
- [ ] L797 · **input / text** · Chọn hoặc nhập loài... · `formServicePetTypeInput`
- [ ] L802 · **input / hidden** · (không có nhãn hiển thị) · `formServicePetType`
- [ ] L807 · **input / text** · VD: 60 phút, Theo ngày... · `formServiceDuration`
- [ ] L825 · **input / text** · 120.000 · `formPriceUnder5`
- [ ] L826 · **input / text** · 150.000 · `formPrice5To10`
- [ ] L827 · **input / text** · 200.000 · `formPrice10To20`
- [ ] L828 · **input / text** · 250.000 · `formPriceOver20`
- [ ] L836 · **textarea** · Mô tả lợi ích và trải nghiệm cho bé... · `formServiceDesc`
- [ ] L843 · **select** · -- Chọn mẫu quy trình có sẵn -- Mẫu Spa trọn gói (7 bước) Mẫu Cắt tỉa tạo kiểu (6 bước) Mẫu Khá · `serviceSopPresetSelect`; lựa chọn: -- Chọn mẫu quy trình có sẵn --, Mẫu Spa trọn gói (7 bước), Mẫu Cắt tỉa tạo kiểu (6 bước), Mẫu Khách sạn lưu trú (6 bước), Mẫu Pet Taxi đưa đón (4 bước)
- [ ] L856 · **input / text** · Nhập tên bước tiếp theo (VD: Tắm xả mượt lông, Sấy tạo phồng...)... · `newServiceStepInput`
- [ ] L857 · **button** · Thêm bước · `btnAddStepToService`
- [ ] L864 · **input / number** · 15 · `formServiceCommission`
- [ ] L868 · **select** · Junior Groomer Senior Groomer Master Groomer Nhân viên chăm sóc lưu trú Tài xế kiêm cứu hộ · `formServiceStaffLevel`; lựa chọn: Junior Groomer, Senior Groomer, Master Groomer, Nhân viên chăm sóc lưu trú, Tài xế kiêm cứu hộ
- [ ] L879 · **select** · Đang phục vụ Tạm ẩn · `formServiceStatus`; lựa chọn: Đang phục vụ, Tạm ẩn
- [ ] L885 · **button** · Hủy · `btnCancelServiceForm`
- [ ] L886 · **button** · Lưu dịch vụ · `btnSubmitServiceForm`

#### modalCancelBooking — 10
- [ ] L899 · **button** · Đóng · `btnCloseCancelBooking`
- [ ] L907 · **select** · Khách hàng bận đột xuất Bé cưng đang có vấn đề sức khỏe Kẹt xe hoặc thời tiết xấu Cửa hàng hết  · `cancelBookingReasonSelect`; lựa chọn: Khách hàng bận đột xuất, Bé cưng đang có vấn đề sức khỏe, Kẹt xe hoặc thời tiết xấu, Cửa hàng hết chỗ hoặc quá tải khung giờ, Lý do khác...
- [ ] L917 · **textarea** · Ghi chú chi tiết nguyên nhân hủy... · `cancelBookingReasonDetail`
- [ ] L919 · **button** · Khách đổi lịch sang ngày khác · `class=reason-quick-chip`
- [ ] L920 · **button** · Bé đang sốt hoặc mệt · `class=reason-quick-chip`
- [ ] L921 · **button** · Thời tiết mưa to · `class=reason-quick-chip`
- [ ] L922 · **button** · Kẹt xe trễ giờ hẹn · `class=reason-quick-chip`
- [ ] L923 · **button** · Khách đặt nhầm dịch vụ · `class=reason-quick-chip`
- [ ] L928 · **button** · Hủy · `btnDismissCancelBooking`
- [ ] L929 · **button** · Xác nhận hủy lịch · `btnConfirmCancelBooking`

#### modalReplyReview — 12
- [ ] L941 · **button** · Đóng · `btnCloseReplyReview`
- [ ] L944 · **input / hidden** · (không có nhãn hiển thị) · `replyReviewIdHidden`
- [ ] L954 · **select** · -- Chọn mẫu câu phản hồi -- Mẫu cảm ơn và tri ân (5 sao) Mẫu ghi nhận góp ý (4 sao) Mẫu xin lỗi · `replyPresetSelect`; lựa chọn: -- Chọn mẫu câu phản hồi --, Mẫu cảm ơn và tri ân (5 sao), Mẫu ghi nhận góp ý (4 sao), Mẫu xin lỗi và chăm sóc lại (1 - 3 sao), Mẫu giải thích quy trình kỹ thuậ
- [ ] L963 · **textarea** · Nhập câu trả lời lịch sự, chu đáo gửi tới khách hàng... · `replyReviewText`
- [ ] L965 · **button** · PawPal chân thành cảm ơn quý khách đã tin yêu dịch vụ! · `class=reason-quick-chip`
- [ ] L966 · **button** · Đội ngũ xin ghi nhận và sẽ nâng cấp quy trình ngay hôm nay. · `class=reason-quick-chip`
- [ ] L967 · **button** · PawPal thành thật xin lỗi vì sự bất tiện này, quản lý sẽ liên hệ hỗ trợ chu đáo. · `class=reason-quick-chip`
- [ ] L968 · **button** · Rất hân hạnh được đồng hành và chăm sóc bé cưng ở các lần hẹn tới! · `class=reason-quick-chip`
- [ ] L974 · **select** · Không gửi kèm voucher Tặng Voucher 50.000 đ Tặng Voucher 100.000 đ Tặng 01 lượt tắm vệ sinh miễ · `replyVoucherSelect`; lựa chọn: Không gửi kèm voucher, Tặng Voucher 50.000 đ, Tặng Voucher 100.000 đ, Tặng 01 lượt tắm vệ sinh miễn phí
- [ ] L984 · **button** · Chuyển thành khiếu nại · `btnEscalateToComplaint`
- [ ] L987 · **button** · Hủy · `btnCancelReplyReview`
- [ ] L988 · **button** · Gửi phản hồi · `btnSubmitReplyReview`

#### modalAddSurcharge — 17
- [ ] L1006 · **button** · Đóng · `btnCloseAddSurcharge`
- [ ] L1011 · **select** · -- Tự nhập loại phụ phí khác -- Phụ phí gỡ rối lông bết cấp 1 (nhẹ) (+50.000 đ) Phụ phí gỡ rối  · `surchargePresetSelect`; lựa chọn: -- Tự nhập loại phụ phí khác --, Phụ phí gỡ rối lông bết cấp 1 (nhẹ) (+50.000 đ), Phụ phí gỡ rối lông bết cấp 2 (nặng/toàn thân) (+100.000 đ), Tắm thuốc y tế tr
- [ ] L1028 · **input / text** · VD: Gỡ rối lông bết nặng... · `surchargeNameInput`
- [ ] L1032 · **input / number** · 50000 · `surchargeAmountInput`
- [ ] L1039 · **select** · 15% (Mặc định) 10% (Gói hỗ trợ nhẹ) 20% (Ca phức tạp hoặc bé dữ) 30% (Chuyên sâu y tế hoặc cấp  · `surchargeCommissionSelect`; lựa chọn: 15% (Mặc định), 10% (Gói hỗ trợ nhẹ), 20% (Ca phức tạp hoặc bé dữ), 30% (Chuyên sâu y tế hoặc cấp cứu), 0% (Không trích hoa hồng)
- [ ] L1057 · **textarea** · Ví dụ: Vùng lông sau tai và ngực bị bết cứng thành mảng, cần gỡ rối 25 phút trước khi tắm... · `surchargeReasonInput`
- [ ] L1059 · **button** · Lông bết rối sau tai và ngực · `class=reason-quick-chip`
- [ ] L1060 · **button** · Ve rận và nấm da diện rộng · `class=reason-quick-chip`
- [ ] L1061 · **button** · Bé nhút nhát cần 2 KTV hỗ trợ · `class=reason-quick-chip`
- [ ] L1062 · **button** · Chênh lệch khung cân nặng thực tế · `class=reason-quick-chip`
- [ ] L1063 · **button** · Cắt tỉa tạo kiểu chi tiết bổ sung · `class=reason-quick-chip`
- [ ] L1070 · **select** · Đã gửi ảnh và video qua Zalo, khách đã đồng ý Đã gọi điện thoại trao đổi và khách xác nhận Khác · `surchargeConsentSelect`; lựa chọn: Đã gửi ảnh và video qua Zalo, khách đã đồng ý, Đã gọi điện thoại trao đổi và khách xác nhận, Khách hàng yêu cầu trực tiếp tại quầy
- [ ] L1078 · **input / text** · VD: Khách dặn làm nhẹ tay, đồng ý mức phí... · `surchargeConsentNote`
- [ ] L1086 · **button** · Đính kèm ảnh bằng chứng · `btnAddSurchargePhotoBtn`
- [ ] L1087 · **input / file** · (không có nhãn hiển thị) · `surchargeProofFileInput`
- [ ] L1095 · **button** · Hủy · `btnCancelAddSurcharge`
- [ ] L1096 · **button** · Lưu phụ phí và ghi nhật ký · `btnSubmitAddSurcharge`

#### modalCarelogPhotoPreview — 1
- [ ] L1109 · **button** · Đóng · `btnClosePhotoPreview`

#### modalEditCarelogStep — 12
- [ ] L1130 · **button** · Đóng · `btnCloseEditCarelogStep`
- [ ] L1133 · **input / hidden** · (không có nhãn hiển thị) · `editCarelogStepIndexHidden`
- [ ] L1136 · **input / text** · Ví dụ: Tắm xả và massage da... · `editCarelogStepTitle`
- [ ] L1141 · **select** · -- Chọn KTV phụ trách -- · `editCarelogStepStaff`; lựa chọn: -- Chọn KTV phụ trách --
- [ ] L1147 · **input / text** · 14:15 · `editCarelogStepTime`
- [ ] L1152 · **textarea** · Mô tả chi tiết quá trình thực hiện bước này... · `editCarelogStepDesc`
- [ ] L1156 · **input / checkbox** · Đã hoàn thành bước kỹ thuật này · `editCarelogStepDone`; thử cả hai trạng thái
- [ ] L1163 · **button** · Thêm ảnh mới · `btnEditCarelogAddPhoto`
- [ ] L1164 · **input / file** · (không có nhãn hiển thị) · `editCarelogFileInput`
- [ ] L1171 · **button** · Xóa bước này · `btnDeleteCarelogStep`
- [ ] L1173 · **button** · Hủy · `btnCancelEditCarelogStep`
- [ ] L1174 · **button** · Lưu thay đổi · `btnSubmitEditCarelogStep`

#### modalAddAccompanyingService — 8
- [ ] L1188 · **button** · Đóng · `btnCloseAddAccompanying`
- [ ] L1193 · **select** · -- Tất cả phân nhóm dịch vụ -- Spa và Grooming Pet Hotel (Lưu trú) Pet Taxi (Xe đưa đón) · `accompanyingCategorySelect`; lựa chọn: -- Tất cả phân nhóm dịch vụ --, Spa và Grooming, Pet Hotel (Lưu trú), Pet Taxi (Xe đưa đón)
- [ ] L1203 · **select** · (không có nhãn hiển thị) · `accompanyingServiceItemSelect`
- [ ] L1211 · **input / number** · VD: 150000 · `accompanyingPriceInput`
- [ ] L1215 · **select** · -- Chọn KTV thực hiện -- · `accompanyingStaffSelect`; lựa chọn: -- Chọn KTV thực hiện --
- [ ] L1223 · **textarea** · Ví dụ: Cắt tỉa mặt tròn Boo, đưa đón về lúc 17h00... · `accompanyingNoteInput`
- [ ] L1227 · **button** · Hủy · `btnCancelAddAccompanying`
- [ ] L1228 · **button** · Lưu dịch vụ đi cùng · `btnSubmitAddAccompanying`

#### Khung chung / ngoài tab — 7
- [ ] L1237 · **input / hidden** · (không có nhãn hiển thị) · `intakeModalMode`
- [ ] L1392 · **button** · Xem chi tiết lịch hẹn · `menuActionViewDetail`
- [ ] L1393 · **button** · Xác nhận lịch hẹn · `menuActionConfirm`
- [ ] L1394 · **button** · Tiếp nhận bé · `menuActionIntake`
- [ ] L1395 · **button** · Đổi kỹ thuật viên · `menuActionChangeStaff`
- [ ] L1396 · **button** · Hoàn thành dịch vụ · `menuActionComplete`
- [ ] L1397 · **button** · Hủy lịch hẹn · `menuActionCancel`

#### modalEditIntakeInfo — 27
- [ ] L1247 · **button** · Đóng · `btnCloseEditIntakeInfo`
- [ ] L1257 · **input / number** · VD: 4.5 · `intakePetWeightInput`
- [ ] L1261 · **select** · -- Chọn KTV tiếp nhận -- · `intakeStaffSelect`; lựa chọn: -- Chọn KTV tiếp nhận --
- [ ] L1271 · **input / checkbox** · Tự động cộng phụ phí chênh lệch phân khúc cân nặng vào ca · `checkAutoAddWeightSurcharge`; thử cả hai trạng thái
- [ ] L1285 · **input / checkbox** · Da lông sạch sẽ · `checkSkinNormal`; thử cả hai trạng thái
- [ ] L1288 · **input / checkbox** · Có ve rận hoặc bọ chét · `checkSkinFleas`; thử cả hai trạng thái
- [ ] L1291 · **input / checkbox** · Có mảng nấm hoặc viêm đỏ · `checkSkinFungus`; thử cả hai trạng thái
- [ ] L1294 · **input / checkbox** · Lông bết rối nhiều · `checkSkinMatted`; thử cả hai trạng thái
- [ ] L1304 · **input / checkbox** · Mắt tai bình thường · `checkEyesEarsNormal`; thử cả hai trạng thái
- [ ] L1307 · **input / checkbox** · Đỏ mắt hoặc nhiều rỉ ghèn · `checkEyesDischarge`; thử cả hai trạng thái
- [ ] L1310 · **input / checkbox** · Sáp tai đen hoặc viêm tai · `checkEarsInfection`; thử cả hai trạng thái
- [ ] L1313 · **input / checkbox** · Chảy nước mũi hoặc hắt hơi · `checkNoseRunny`; thử cả hai trạng thái
- [ ] L1323 · **input / checkbox** · Không có vết thương cũ · `checkWoundNone`; thử cả hai trạng thái
- [ ] L1326 · **input / checkbox** · Có vết trầy xước hoặc sẹo cũ · `checkWoundExisting`; thử cả hai trạng thái
- [ ] L1329 · **input / text** · Ghi chú vị trí vết xước có sẵn (nếu có)... · `intakeExistingWoundNote`
- [ ] L1337 · **input / radio** · Ngoan hiền và thân thiện · `class=`; thử cả hai trạng thái
- [ ] L1340 · **input / radio** · Nhút nhát hoặc sợ nước · `class=`; thử cả hai trạng thái
- [ ] L1343 · **input / radio** · Bồn chồn hoặc cần rọ mõm an toàn · `class=`; thử cả hai trạng thái
- [ ] L1355 · **input / checkbox** · Dây dắt · `class=check-belonging-item`; thử cả hai trạng thái
- [ ] L1358 · **input / checkbox** · Lồng hoặc túi xách · `class=check-belonging-item`; thử cả hai trạng thái
- [ ] L1361 · **input / checkbox** · Quần áo hoặc yếm · `class=check-belonging-item`; thử cả hai trạng thái
- [ ] L1364 · **input / checkbox** · Thức ăn hoặc thuốc riêng · `class=check-belonging-item`; thử cả hai trạng thái
- [ ] L1367 · **textarea** · Mô tả cụ thể (ví dụ: 01 Dây dắt đỏ bản to, 01 Chuồng nhựa màu xanh)... · `intakeBelongingsInput`
- [ ] L1374 · **button** · Tải ảnh bằng chứng · `btnAddProofPhotoBtn`
- [ ] L1375 · **input / file** · (không có nhãn hiển thị) · `intakeProofFileInput`
- [ ] L1383 · **button** · Hủy · `btnCancelEditIntakeInfo`
- [ ] L1384 · **button** · Xác nhận tiếp nhận và bắt đầu ca · `intakeModalSubmitBtn`

#### modalChangeStaff — 12
- [ ] L1412 · **button** · Đóng · `btnCloseChangeStaff`
- [ ] L1424 · **select** · -- Chọn KTV mới -- · `changeStaffSelect`; lựa chọn: -- Chọn KTV mới --
- [ ] L1432 · **select** · -- Chọn lý do điều phối chuẩn hóa -- KTV bận ca khẩn cấp hoặc lịch hẹn đột xuất Bé nhút nhát ho · `changeStaffPresetReason`; lựa chọn: -- Chọn lý do điều phối chuẩn hóa --, KTV bận ca khẩn cấp hoặc lịch hẹn đột xuất, Bé nhút nhát hoặc khó chịu, cần KTV chuyên môn cao hơn, Khách hàng yêu cầu đổi
- [ ] L1440 · **input / text** · Nhập lý do chi tiết hoặc ghi chú bàn giao... · `changeStaffReasonInput`
- [ ] L1442 · **button** · KTV bận ca khẩn cấp · `class=reason-quick-chip`
- [ ] L1443 · **button** · Bé cần KTV tay nghề cao hơn · `class=reason-quick-chip`
- [ ] L1444 · **button** · Khách quen yêu cầu đổi KTV · `class=reason-quick-chip`
- [ ] L1445 · **button** · Điều phối cân bằng tải ca trực · `class=reason-quick-chip`
- [ ] L1453 · **input / radio** · Tiếp quản các bước kỹ thuật tiếp theo (KTV cũ đã hoàn thành các bước trước) · `class=`; thử cả hai trạng thái
- [ ] L1456 · **input / radio** · Bàn giao toàn bộ ca dịch vụ (KTV mới phụ trách toàn bộ từ đầu) · `class=`; thử cả hai trạng thái
- [ ] L1462 · **button** · Hủy · `btnCancelChangeStaff`
- [ ] L1463 · **button** · Xác nhận điều chuyển KTV · `btnSubmitChangeStaff`

#### modalCompleteBooking — 11
- [ ] L1481 · **button** · Đóng · `btnCloseCompleteBooking`
- [ ] L1491 · **input / checkbox** · Xác nhận toàn bộ quy trình chăm sóc và vệ sinh đã đạt tiêu chuẩn spa · `completeCheckQuality`; thử cả hai trạng thái
- [ ] L1503 · **input / checkbox** · Đã đối chiếu và trao trả đầy đủ toàn bộ tư trang, phụ kiện cho chủ nuôi · `completeCheckBelongings`; thử cả hai trạng thái
- [ ] L1527 · **select** · -- Không dùng voucher -- PAWSPA50 - Giảm 50.000 đ VIPCARE100 - Giảm 100.000 đ MEMBER10 - Giảm 1 · `completeVoucherSelect`; lựa chọn: -- Không dùng voucher --, PAWSPA50 - Giảm 50.000 đ, VIPCARE100 - Giảm 100.000 đ, MEMBER10 - Giảm 10% tổng bill
- [ ] L1536 · **select** · -- Không trừ điểm -- Dùng 100 điểm (-10.000 đ) Dùng 200 điểm (-20.000 đ) Dùng 500 điểm (-50.000 · `completePointsSelect`; lựa chọn: -- Không trừ điểm --, Dùng 100 điểm (-10.000 đ), Dùng 200 điểm (-20.000 đ), Dùng 500 điểm (-50.000 đ)
- [ ] L1563 · **select** · Tiền mặt (Tại quầy) Chuyển khoản VietQR Thẻ ngân hàng (POS) Ví MoMo hoặc VNPay Đã thanh toán tr · `completePaymentMethodSelect`; lựa chọn: Tiền mặt (Tại quầy), Chuyển khoản VietQR, Thẻ ngân hàng (POS), Ví MoMo hoặc VNPay, Đã thanh toán trước Online
- [ ] L1574 · **input / checkbox** · Đã thu đủ tiền tại quầy · `completeCheckPaid`; thử cả hai trạng thái
- [ ] L1584 · **button** · Tải ảnh thành phẩm · `btnAddCompletePhotoBtn`
- [ ] L1585 · **input / file** · (không có nhãn hiển thị) · `completeProofFileInput`
- [ ] L1593 · **button** · Hủy · `btnCancelCompleteBooking`
- [ ] L1594 · **button** · Xác nhận bàn giao và xuất phiếu · `completeModalSubmitBtn`

#### modalViewSopDetails — 2
- [ ] L1612 · **button** · Đóng · `btnCloseSopViewer`
- [ ] L1626 · **button** · Đóng · `btnDismissSopViewer`

#### modalPrintIntakeWaiver — 3
- [ ] L1642 · **button** · Đóng · `btnCloseIntakeWaiver`
- [ ] L1739 · **button** · Đóng · `btnDismissIntakeWaiver`
- [ ] L1740 · **button** · In phiếu tiếp nhận · `btnPrintIntakeWaiverAction`

#### modalNotifyPickup — 9
- [ ] L1757 · **button** · Đóng · `btnCloseNotifyPickup`
- [ ] L1766 · **input / radio** · Zalo ZNS và OA (Khuyến nghị - Tiết kiệm và tương tác cao) · `class=`; thử cả hai trạng thái
- [ ] L1770 · **input / radio** · SMS Brandname · `class=`; thử cả hai trạng thái
- [ ] L1792 · **button** · Khôi phục mẫu chuẩn · `btnResetNotifyTemplate`
- [ ] L1794 · **textarea** · (không có nhãn hiển thị) · `notifyPickupMessageText`
- [ ] L1800 · **input / checkbox** · Đính kèm đường dẫn xem ảnh thành phẩm và nhật ký chăm sóc thực tế · `notifyIncludeCarelogLink`; thử cả hai trạng thái
- [ ] L1804 · **input / checkbox** · Ghi nhận sự kiện thông báo này vào Timeline Care-Log · `notifyLogTimelineEvent`; thử cả hai trạng thái
- [ ] L1810 · **button** · Hủy · `btnCancelNotifyPickup`
- [ ] L1811 · **button** · Gửi thông báo ngay · `btnSendNotifyPickup`

#### modalStaffSchedule — 7
- [ ] L1824 · **button** · Đóng · `btnCloseStaffSchedule`
- [ ] L1850 · **button** · Tất cả ca trực · `class=staff-shift-tab-btn.active`
- [ ] L1852 · **button** · Ca sáng (08:00 - 12:00) · `class=staff-shift-tab-btn`
- [ ] L1854 · **button** · Ca chiều (13:00 - 17:00) · `class=staff-shift-tab-btn`
- [ ] L1856 · **button** · Ca tối (17:00 - 21:00) · `class=staff-shift-tab-btn`
- [ ] L1866 · **button** · Quản lý nhân sự · `btnNavToStaffModule`
- [ ] L1867 · **button** · Đóng · `btnDismissStaffSchedule`

#### modalConfirmServiceAction — 3
- [ ] L1878 · **button** · Đóng · `btnCloseConfirmServiceAction`
- [ ] L1886 · **button** · Hủy · `btnCancelServiceConfirm`
- [ ] L1887 · **button** · Đồng ý · `btnAcceptServiceConfirm`

### pages/admin/modules/settings/settings.html — 137 điều khiển

#### subtab-tab-banner-promos — 14
- [ ] L32 · **button** · Voucher khuyến mãi · `class=settings-tab-btn.active`
- [ ] L35 · **button** · Banner Website · `class=settings-tab-btn`
- [ ] L38 · **button** · Chính sách PawPoints · `class=settings-tab-btn`
- [ ] L41 · **button** · Thông báo Website · `class=settings-tab-btn`
- [ ] L55 · **button** · Lọc mục cần xử lý · `btnFilterZeroMiss`
- [ ] L63 · **input / text** · Tìm theo tên chương trình, mã voucher... · `searchVoucherInput`
- [ ] L66 · **button** · Tạo voucher · `btnOpenVoucherModalHeader`
- [ ] L72 · **select** · Tất cả đối tượng Dịch vụ Spa Pet Hotel Taxi Pet Cửa hàng Toàn hệ thống · `filterVoucherTarget`; lựa chọn: Tất cả đối tượng, Dịch vụ Spa, Pet Hotel, Taxi Pet, Cửa hàng, Toàn hệ thống
- [ ] L83 · **select** · Tất cả trạng thái Cần xử lý gấp Hoạt động Tạm dừng Hết hạn · `filterVoucherStatus`; lựa chọn: Tất cả trạng thái, Cần xử lý gấp, Hoạt động, Tạm dừng, Hết hạn
- [ ] L121 · **button** · Trang trước · `class=pagination-btn.disabled`
- [ ] L123 · **button** · Trang sau · `class=pagination-btn.voucher-page-next`
- [ ] L133 · **button** · Thêm banner · `btnOpenBannerModal`
- [ ] L148 · **button** · Cấu hình PawPoints · `btnEditPawpointsLink`
- [ ] L183 · **button** · Thêm thông báo · `btnAddNoticeLink`

#### subtab-tab-content-management — 6
- [ ] L236 · **input / text** · Tìm theo tiêu đề bài viết... · `searchArticleInput`
- [ ] L239 · **button** · Tạo bài viết mới · `btnOpenCreateArticleModal`
- [ ] L245 · **select** · Tất cả danh mục Chó cưng Mèo cưng Dinh dưỡng Grooming và Spa Mẹo chăm sóc · `filterArticleCategory`; lựa chọn: Tất cả danh mục, Chó cưng, Mèo cưng, Dinh dưỡng, Grooming và Spa, Mẹo chăm sóc
- [ ] L256 · **select** · Tất cả trạng thái Công khai Bản nháp Tạm ẩn · `filterArticleStatus`; lựa chọn: Tất cả trạng thái, Công khai, Bản nháp, Tạm ẩn
- [ ] L292 · **button** · Trang trước · `class=pagination-btn.disabled`
- [ ] L294 · **button** · Trang sau · `class=pagination-btn.article-page-next`

#### subtab-tab-system-config — 6
- [ ] L310 · **button** · Mở khóa để sửa · `btnToggleSafeMode`
- [ ] L346 · **button** · Cấu hình thông tin · `btnConfigureStoreProfile`
- [ ] L378 · **button** · Cấu hình thanh toán · `btnConfigurePayment`
- [ ] L410 · **button** · Cấu hình giao hàng · `btnConfigureShipping`
- [ ] L442 · **button** · Cấu hình chính sách · `btnConfigureBookingPolicy`
- [ ] L470 · **button** · Kiểm tra kết nối đối tác · `btnConfigurePartners`

#### subtab-tab-audit-logs — 3
- [ ] L505 · **input / text** · Tìm theo nội dung thay đổi hoặc người thực hiện... · `searchAuditLogInput`
- [ ] L509 · **button** · Mở khóa để sửa · `btnToggleSafeModeAudit`
- [ ] L515 · **select** · Tất cả phân hệ Khách hàng Dịch vụ Bán hàng Nhân sự Cửa hàng · `filterAuditTargetModule`; lựa chọn: Tất cả phân hệ, Khách hàng, Dịch vụ, Bán hàng, Nhân sự, Cửa hàng

#### bannerModalOverlay — 9
- [ ] L559 · **button** · Đóng · `btnCancelBannerModal`
- [ ] L565 · **input / text** · Ví dụ: Ưu đãi Spa Mùa Hè 30% · `inputBannerTitle`
- [ ] L569 · **input / text** · Nhập đường dẫn ảnh hoặc tên tệp... · `inputBannerImage`
- [ ] L574 · **input / text** · Ví dụ: Đặt lịch ngay · `inputBannerCta`
- [ ] L579 · **input / text** · Chọn hoặc nhập đường dẫn... · `inputBannerUrl`
- [ ] L587 · **input / date** · (không có nhãn hiển thị) · `inputBannerStartDate`
- [ ] L591 · **input / date** · (không có nhãn hiển thị) · `inputBannerEndDate`
- [ ] L596 · **button** · Hủy · `btnDismissBannerModal`
- [ ] L597 · **button** · Lưu banner · `btnSaveBanner`

#### voucherModalOverlay — 14
- [ ] L608 · **button** · Đóng · `btnCancelVoucherModal`
- [ ] L616 · **button** · Tạo mã tự động · `btnAutoGenerateVoucherCode`
- [ ] L618 · **input / text** · Ví dụ: PAWPAL30K · `inputVoucherCode`
- [ ] L622 · **input / text** · Tên chương trình ưu đãi... · `inputVoucherName`
- [ ] L628 · **select** · Giảm số tiền cố định (VNĐ) Giảm theo phần trăm (%) · `inputVoucherType`; lựa chọn: Giảm số tiền cố định (VNĐ), Giảm theo phần trăm (%)
- [ ] L635 · **input / number** · 30000 hoặc 15 · `inputVoucherValue`
- [ ] L641 · **input / number** · (không có nhãn hiển thị) · `inputVoucherMinOrder`
- [ ] L645 · **input / number** · (không có nhãn hiển thị) · `inputVoucherLimit`
- [ ] L651 · **select** · Toàn hệ thống Dịch vụ Spa và Grooming Pet Hotel Mua sản phẩm · `inputVoucherTarget`; lựa chọn: Toàn hệ thống, Dịch vụ Spa và Grooming, Pet Hotel, Mua sản phẩm
- [ ] L660 · **select** · Tất cả khách hàng Hạng Bạc trở lên Hạng Vàng trở lên Hạng Kim Cương (VIP) · `inputVoucherTier`; lựa chọn: Tất cả khách hàng, Hạng Bạc trở lên, Hạng Vàng trở lên, Hạng Kim Cương (VIP)
- [ ] L671 · **input / date** · (không có nhãn hiển thị) · `inputVoucherStart`
- [ ] L675 · **input / date** · (không có nhãn hiển thị) · `inputVoucherEnd`
- [ ] L696 · **button** · Hủy · `btnDismissVoucherModal`
- [ ] L697 · **button** · Tạo voucher · `btnSaveVoucher`

#### pawpointsModalOverlay — 8
- [ ] L708 · **button** · Đóng · `btnCancelPawpointsModal`
- [ ] L714 · **input / number** · (không có nhãn hiển thị) · `inputCfgPointValue`
- [ ] L719 · **input / number** · (không có nhãn hiển thị) · `inputCfgRegisterPoints`
- [ ] L723 · **input / number** · (không có nhãn hiển thị) · `inputCfgFirstOrderPoints`
- [ ] L729 · **input / number** · (không có nhãn hiển thị) · `inputCfgFirstBookingPoints`
- [ ] L733 · **input / number** · (không có nhãn hiển thị) · `inputCfgBirthdayPoints`
- [ ] L738 · **button** · Hủy · `btnDismissPawpointsModal`
- [ ] L739 · **button** · Lưu chính sách · `btnSavePawpointsPolicy`

#### notificationModalOverlay — 6
- [ ] L750 · **button** · Đóng · `btnCancelNoticeModal`
- [ ] L756 · **textarea** · Nhập thông báo gửi khách hàng... · `inputNoticeContent`
- [ ] L761 · **select** · Top-bar đầu trang Popup giữa màn hình · `inputNoticeType`; lựa chọn: Top-bar đầu trang, Popup giữa màn hình
- [ ] L768 · **select** · Kích hoạt ngay Tạm tắt · `inputNoticeStatus`; lựa chọn: Kích hoạt ngay, Tạm tắt
- [ ] L776 · **button** · Hủy · `btnDismissNoticeModal`
- [ ] L777 · **button** · Lưu thông báo · `btnSaveNotice`

#### articleModalOverlay — 8
- [ ] L788 · **button** · Đóng · `btnCancelArticleModal`
- [ ] L794 · **input / text** · Tiêu đề bài viết hấp dẫn... · `inputArticleTitle`
- [ ] L799 · **select** · Chó cưng Mèo cưng Dinh dưỡng Grooming và Spa Mẹo chăm sóc · `inputArticleCategory`; lựa chọn: Chó cưng, Mèo cưng, Dinh dưỡng, Grooming và Spa, Mẹo chăm sóc
- [ ] L809 · **select** · Công khai ngay Lưu bản nháp Tạm ẩn · `inputArticleStatus`; lựa chọn: Công khai ngay, Lưu bản nháp, Tạm ẩn
- [ ] L818 · **textarea** · Tóm tắt ngắn 1-2 câu hiển thị ở danh sách bài viết... · `inputArticleSummary`
- [ ] L822 · **textarea** · Nội dung cẩm nang chia sẻ kiến thức chăm sóc thú cưng... · `inputArticleContent`
- [ ] L826 · **button** · Hủy · `btnDismissArticleModal`
- [ ] L827 · **button** · Xuất bản bài viết · `btnSaveArticle`

#### storeProfileModalOverlay — 12
- [ ] L838 · **button** · Đóng · `btnCancelStoreProfileModal`
- [ ] L845 · **input / text** · (không có nhãn hiển thị) · `inputStoreBrandName`
- [ ] L849 · **input / text** · (không có nhãn hiển thị) · `inputStoreCompanyName`
- [ ] L855 · **input / text** · (không có nhãn hiển thị) · `inputStoreHotline`
- [ ] L859 · **input / text** · (không có nhãn hiển thị) · `inputStoreEmergency`
- [ ] L865 · **input / email** · (không có nhãn hiển thị) · `inputStoreEmail`
- [ ] L869 · **input / text** · (không có nhãn hiển thị) · `inputStoreTaxId`
- [ ] L874 · **input / text** · (không có nhãn hiển thị) · `inputStoreAddress`
- [ ] L879 · **input / text** · (không có nhãn hiển thị) · `inputStoreZalo`
- [ ] L883 · **input / text** · (không có nhãn hiển thị) · `inputStoreFacebook`
- [ ] L888 · **button** · Hủy · `btnDismissStoreProfileModal`
- [ ] L889 · **button** · Lưu thông tin cửa hàng · `btnSaveStoreProfile`

#### paymentConfigModalOverlay — 11
- [ ] L900 · **button** · Đóng · `btnCancelPaymentModal`
- [ ] L907 · **input / checkbox** · Thanh toán COD · `toggleCodEnabled`; thử cả hai trạng thái
- [ ] L911 · **input / checkbox** · QR Banking · `toggleBankEnabled`; thử cả hai trạng thái
- [ ] L917 · **input / checkbox** · Ví điện tử MoMo · `toggleMomoEnabled`; thử cả hai trạng thái
- [ ] L921 · **input / checkbox** · Cổng VNPay · `toggleVnpayEnabled`; thử cả hai trạng thái
- [ ] L930 · **select** · Vietcombank - Ngân hàng Ngoại thương Techcombank - Ngân hàng Kỹ thương MB Bank - Ngân hàng Quân · `inputPaymentBank`; lựa chọn: Vietcombank - Ngân hàng Ngoại thương, Techcombank - Ngân hàng Kỹ thương, MB Bank - Ngân hàng Quân đội, ACB - Ngân hàng Á Châu
- [ ] L940 · **input / text** · (không có nhãn hiển thị) · `inputPaymentAccNo`
- [ ] L944 · **input / text** · (không có nhãn hiển thị) · `inputPaymentAccHolder`
- [ ] L949 · **input / text** · (không có nhãn hiển thị) · `inputPaymentSyntax`
- [ ] L954 · **button** · Hủy · `btnDismissPaymentModal`
- [ ] L955 · **button** · Lưu cấu hình · `btnSavePaymentConfig`

#### shippingConfigModalOverlay — 10
- [ ] L966 · **button** · Đóng · `btnCancelShippingModal`
- [ ] L974 · **input / number** · Ví dụ: 300000 · `inputFreeShippingThreshold`
- [ ] L978 · **input / number** · (không có nhãn hiển thị) · `inputInnerCityFee`
- [ ] L984 · **input / number** · (không có nhãn hiển thị) · `inputOuterCityFee`
- [ ] L988 · **input / number** · (không có nhãn hiển thị) · `inputExpressFee`
- [ ] L996 · **select** · Giao Hàng Nhanh (GHN Express) Giao Hàng Tiết Kiệm (GHTK) GrabExpress Siêu Tốc · `inputShippingProvider`; lựa chọn: Giao Hàng Nhanh (GHN Express), Giao Hàng Tiết Kiệm (GHTK), GrabExpress Siêu Tốc
- [ ] L1005 · **input / text** · (không có nhãn hiển thị) · `inputShippingShopId`
- [ ] L1009 · **input / password** · (không có nhãn hiển thị) · `inputShippingApiKey`
- [ ] L1015 · **button** · Hủy · `btnDismissShippingModal`
- [ ] L1016 · **button** · Lưu cấu hình giao hàng · `btnSaveShippingConfig`

#### bookingPolicyModalOverlay — 14
- [ ] L1027 · **button** · Đóng · `btnCancelBookingPolicyModal`
- [ ] L1036 · **input / time** · (không có nhãn hiển thị) · `inputWeekdayOpen`
- [ ] L1038 · **input / time** · (không có nhãn hiển thị) · `inputWeekdayClose`
- [ ] L1044 · **input / time** · (không có nhãn hiển thị) · `inputWeekendOpen`
- [ ] L1046 · **input / time** · (không có nhãn hiển thị) · `inputWeekendClose`
- [ ] L1056 · **input / time** · (không có nhãn hiển thị) · `inputHotelCheckIn`
- [ ] L1060 · **input / time** · (không có nhãn hiển thị) · `inputHotelCheckOut`
- [ ] L1065 · **input / number** · (không có nhãn hiển thị) · `inputHotelLateFee`
- [ ] L1074 · **input / number** · (không có nhãn hiển thị) · `inputSlotCapacity`
- [ ] L1078 · **input / number** · (không có nhãn hiển thị) · `inputFreeCancelHours`
- [ ] L1084 · **input / number** · (không có nhãn hiển thị) · `inputLateCancelFee`
- [ ] L1088 · **select** · Cho phép khách chỉ định nhân viên chăm sóc Hệ thống tự động xếp ca ngẫu nhiên · `inputAllowPickStaff`; lựa chọn: Cho phép khách chỉ định nhân viên chăm sóc, Hệ thống tự động xếp ca ngẫu nhiên
- [ ] L1097 · **button** · Hủy · `btnDismissBookingPolicyModal`
- [ ] L1098 · **button** · Lưu chính sách và giờ mở cửa · `btnSaveBookingPolicy`

#### impactConfirmModalOverlay — 3
- [ ] L1109 · **button** · Đóng · `btnCancelImpactModal`
- [ ] L1120 · **button** · Hủy bỏ · `btnDismissImpactModal`
- [ ] L1121 · **button** · Xác nhận và đồng bộ ngay · `btnConfirmAndSyncImpact`

#### articleRagModalOverlay — 3
- [ ] L1131 · **button** · Đóng · `btnCancelRagModal`
- [ ] L1155 · **button** · Đóng · `btnDismissRagModal`
- [ ] L1156 · **button** · Đồng bộ lại vào chatbot · `btnSyncRagArticle`

#### modalConfirmSettingsAction — 3
- [ ] L1166 · **button** · Đóng · `btnCloseConfirmSettingsModal`
- [ ] L1174 · **button** · Hủy bỏ · `btnCancelSettingsConfirm`
- [ ] L1175 · **button** · Đồng ý · `btnAcceptSettingsConfirm`

#### Khung chung / ngoài tab — 7
- [ ] L1182 · **button** · Gia hạn thêm 50 lượt · `btnActionExtendQuota`
- [ ] L1183 · **button** · Đổi trạng thái Bật/Tắt · `btnActionToggleStatus`
- [ ] L1184 · **button** · Xóa Voucher · `btnActionDeleteVoucher`
- [ ] L1189 · **button** · Xem tóm tắt AI (RAG) · `btnActionViewRag`
- [ ] L1190 · **button** · Đồng bộ lại vào Chatbot · `btnActionSyncRag`
- [ ] L1191 · **button** · Đổi trạng thái Công khai / Tạm ẩn · `btnActionToggleArticleStatus`
- [ ] L1192 · **button** · Xóa bài viết · `btnActionDeleteArticle`

### pages/admin/modules/staff/staff.html — 130 điều khiển

#### subtab-tab-staff-list — 11
- [ ] L41 · **button** · Lọc danh sách · `btnFilterStaffAlertQuick`
- [ ] L48 · **input / text** · Tìm mã nhân viên, họ tên, số điện thoại... · `staffSearchInput`
- [ ] L49 · **button** · Xóa nội dung tìm kiếm · `btnClearStaffSearch`
- [ ] L52 · **button** · Xuất Excel · `btnExportStaff`
- [ ] L53 · **button** · Thêm nhân viên · `btnOpenAddStaffModal`
- [ ] L60 · **select** · Tất cả Quản trị viên Bác sĩ/Bảo mẫu Lễ tân Groomer Bảo mẫu Pet Hotel CSKH Tài xế Taxi Pet · `staffFilterPosition`; lựa chọn: Tất cả, Quản trị viên, Bác sĩ/Bảo mẫu, Lễ tân, Groomer, Bảo mẫu Pet Hotel, CSKH, Tài xế Taxi Pet
- [ ] L74 · **select** · Tất cả Đang làm việc Nghỉ phép Tạm nghỉ Nghỉ việc · `staffFilterStatus`; lựa chọn: Tất cả, Đang làm việc, Nghỉ phép, Tạm nghỉ, Nghỉ việc
- [ ] L85 · **select** · Tất cả Ca sáng Ca chiều Ca tối Ca khuya Toàn thời gian · `staffFilterShift`; lựa chọn: Tất cả, Ca sáng, Ca chiều, Ca tối, Ca khuya, Toàn thời gian
- [ ] L95 · **button** · Cần đào tạo lại · `btnFilterRetrainOnly`
- [ ] L96 · **button** · Đang khóa nhận việc · `btnFilterLockOnly`
- [ ] L97 · **button** · Xóa bộ lọc · `btnStaffClearFilters`

#### subtab-tab-staff-profile — 4
- [ ] L152 · **button** · Khóa nhận việc · `btnProfileToggleSafetyLock`
- [ ] L153 · **button** · Chỉnh sửa hồ sơ · `btnProfileEditStaff`
- [ ] L154 · **button** · Phân ca làm việc · `btnProfileAssignShift`
- [ ] L155 · **button** · Đánh giá nghiệp vụ · `btnProfileAddAssessment`

#### subtab-tab-staff-schedule — 12
- [ ] L364 · **button** · Báo cáo sự cố ca · `btnOpenIncidentReportModal`
- [ ] L376 · **button** · < · `btnPrevDay`
- [ ] L377 · **input / date** · (không có nhãn hiển thị) · `scheduleDatePicker`
- [ ] L378 · **button** · > · `btnNextDay`
- [ ] L379 · **button** · Hôm nay · `btnToday`
- [ ] L383 · **button** · Theo ngày · `btnScheduleViewDay`
- [ ] L384 · **button** · Theo tuần · `btnScheduleViewWeek`
- [ ] L388 · **button** · Đơn xin nghỉ và đổi ca ( 0 ) · `btnOpenLeaveRequestsTray`
- [ ] L389 · **button** · Tạo đơn nghỉ hoặc đổi ca · `btnOpenLeaveSwapModal`
- [ ] L390 · **button** · Phân ca làm việc · `btnOpenAssignShiftModal`
- [ ] L397 · **select** · Tất cả Quản trị viên Bác sĩ thú y Lễ tân Groomer Bảo mẫu Pet Hotel CSKH Tài xế Taxi Pet · `scheduleFilterPosition`; lựa chọn: Tất cả, Quản trị viên, Bác sĩ thú y, Lễ tân, Groomer, Bảo mẫu Pet Hotel, CSKH, Tài xế Taxi Pet
- [ ] L411 · **select** · Tất cả Ca sáng Ca chiều Ca tối Ca khuya · `scheduleFilterShift`; lựa chọn: Tất cả, Ca sáng, Ca chiều, Ca tối, Ca khuya

#### subtab-tab-staff-assessment — 5
- [ ] L498 · **input / text** · Tìm mã nhân viên, họ tên... · `assessmentSearchInput`
- [ ] L499 · **button** · Xóa nội dung tìm kiếm · `btnClearAssessmentSearch`
- [ ] L502 · **button** · Ghi nhận đánh giá · `btnOpenAddAssessmentModal`
- [ ] L509 · **select** · Tất cả Grooming Spa CSKH Taxi Pet Lưu trú 24/7 Sơ cứu và An toàn thú cưng · `assessmentFilterType`; lựa chọn: Tất cả, Grooming, Spa, CSKH, Taxi Pet, Lưu trú 24/7, Sơ cứu và An toàn thú cưng
- [ ] L522 · **select** · Tất cả Đạt Cần đào tạo Không đạt · `assessmentFilterResult`; lựa chọn: Tất cả, Đạt, Cần đào tạo, Không đạt

#### Khung chung / ngoài tab — 10
- [ ] L563 · **button** · Đóng · `btnCloseStaffDrawer`
- [ ] L568 · **button** · Chỉnh sửa hồ sơ · `btnEditStaffProfile`
- [ ] L569 · **button** · Phân ca · `btnAssignShift`
- [ ] L570 · **button** · Đánh giá nghiệp vụ · `btnRecordAssessment`
- [ ] L1202 · **button** · Xem hồ sơ · `menuActionViewProfile`
- [ ] L1203 · **button** · Khóa / Mở nhận việc · `menuActionToggleLock`
- [ ] L1204 · **button** · Chỉnh sửa hồ sơ · `menuActionEditStaff`
- [ ] L1205 · **button** · Xem lịch làm việc · `menuActionViewSchedule`
- [ ] L1206 · **button** · Xem lịch sử đánh giá · `menuActionViewAssess`
- [ ] L1207 · **button** · Xóa nhân viên · `menuActionDeleteStaff`

#### staffModalOverlay — 30
- [ ] L644 · **button** · Đóng · `btnCancelStaff`
- [ ] L651 · **input / text** · Ví dụ: Nguyễn Văn A · `staffInputName`
- [ ] L655 · **input / text** · 10 chữ số... · `staffInputPhone`
- [ ] L659 · **input / email** · abc@pawpal.vn · `staffInputEmail`
- [ ] L663 · **input / text** · Địa chỉ thường trú... · `staffInputAddress`
- [ ] L667 · **input / date** · (không có nhãn hiển thị) · `staffInputDob`
- [ ] L671 · **input / date** · (không có nhãn hiển thị) · `staffInputJoinDate`
- [ ] L679 · **select** · Quản trị viên Lễ tân tiếp đón Kỹ thuật viên grooming Chuyên viên spa thú cưng Bảo mẫu lưu trú p · `staffInputPosition`; lựa chọn: Quản trị viên, Lễ tân tiếp đón, Kỹ thuật viên grooming, Chuyên viên spa thú cưng, Bảo mẫu lưu trú pet hotel, Chăm sóc khách hàng, Tài xế taxi pet
- [ ] L691 · **select** · Chọn ca làm việc Ca sáng Ca chiều Ca tối Ca khuya · `staffInputShift`; lựa chọn: Chọn ca làm việc, Ca sáng, Ca chiều, Ca tối, Ca khuya
- [ ] L701 · **input / text** · Ví dụ: Cắt tỉa tạo kiểu Poodle, Spa chuyên sâu... · `staffInputSpecialization`
- [ ] L708 · **input / checkbox** · Cấp tài khoản đăng nhập Pawpal-er · `staffEnableAccountToggle`; thử cả hai trạng thái
- [ ] L723 · **button** · Đặt lại mật khẩu · `btnStaffResetPasswordModal`
- [ ] L724 · **button** · Khóa tài khoản · `btnStaffToggleLockAccount`
- [ ] L731 · **input / email** · nv.ten@pawpal.vn · `staffAccountEmail`
- [ ] L736 · **button** · Tạo ngẫu nhiên · `btnGenerateRandomStaffPass`
- [ ] L738 · **input / text** · Tối thiểu 6 ký tự... · `staffAccountPassword`
- [ ] L745 · **select** · Quản trị viên (Toàn quyền hệ thống) Lễ tân tiếp đón (Lịch hẹn và tiếp nhận) Kỹ thuật viên groom · `staffAccountSystemRole`; lựa chọn: Quản trị viên (Toàn quyền hệ thống), Lễ tân tiếp đón (Lịch hẹn và tiếp nhận), Kỹ thuật viên grooming (Ca dịch vụ và nhật ký), Bảo mẫu lưu trú pet hotel (Lưu trú
- [ ] L757 · **input / checkbox** · Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên · `staffMustChangePasswordCheckbox`; thử cả hai trạng thái
- [ ] L768 · **input / checkbox** · Xem lịch hẹn · `class=`; thử cả hai trạng thái
- [ ] L769 · **input / checkbox** · Tiếp nhận và Xác nhận ca · `class=`; thử cả hai trạng thái
- [ ] L770 · **input / checkbox** · Hủy hoặc Chuyển ca hẹn · `class=`; thử cả hai trạng thái
- [ ] L774 · **input / checkbox** · Cập nhật hình ảnh thực tế · `class=`; thử cả hai trạng thái
- [ ] L775 · **input / checkbox** · Ghi chú sức khỏe và Thể trạng · `class=`; thử cả hai trạng thái
- [ ] L779 · **input / checkbox** · Tạo đơn hàng tại quầy · `class=`; thử cả hai trạng thái
- [ ] L780 · **input / checkbox** · Thu ngân và Thanh toán · `class=`; thử cả hai trạng thái
- [ ] L784 · **input / checkbox** · Quản lý hồ sơ nhân sự · `class=`; thử cả hai trạng thái
- [ ] L785 · **input / checkbox** · Điều phối ca làm việc · `class=`; thử cả hai trạng thái
- [ ] L786 · **input / checkbox** · Cấu hình khuyến mãi · `class=`; thử cả hai trạng thái
- [ ] L791 · **button** · Hủy · `btnDismissStaffModal`
- [ ] L792 · **button** · Lưu nhân viên · `btnSaveStaff`

#### shiftModalOverlay — 5
- [ ] L804 · **button** · Đóng · `btnCancelShiftModal`
- [ ] L810 · **input / date** · (không có nhãn hiển thị) · `shiftInputDate`
- [ ] L814 · **select** · Ca sáng (08:00 - 12:00) Ca chiều (13:00 - 17:00) Ca tối (17:30 - 21:30) Ca khuya (22:00 - 06:00 · `shiftInputShift`; lựa chọn: Ca sáng (08:00 - 12:00), Ca chiều (13:00 - 17:00), Ca tối (17:30 - 21:30), Ca khuya (22:00 - 06:00)
- [ ] L842 · **button** · Hủy · `btnDismissShiftModal`
- [ ] L843 · **button** · Lưu phân ca · `btnSaveShift`

#### assessmentModalOverlay — 10
- [ ] L855 · **button** · Đóng · `btnCancelAssessmentModal`
- [ ] L860 · **select** · (không có nhãn hiển thị) · `assessInputStaff`
- [ ] L867 · **input / date** · (không có nhãn hiển thị) · `assessInputDate`
- [ ] L871 · **select** · Grooming và cắt tỉa tạo kiểu Chăm sóc spa và phục hồi lông da Chăm sóc khách hàng và tiếp nhận  · `assessInputType`; lựa chọn: Grooming và cắt tỉa tạo kiểu, Chăm sóc spa và phục hồi lông da, Chăm sóc khách hàng và tiếp nhận, Vận chuyển taxi pet an toàn, Lưu trú và chăm sóc pet hotel, Sơ
- [ ] L884 · **input / number** · Nhập điểm... · `assessInputScore`
- [ ] L888 · **select** · Đạt tiêu chuẩn (≥ 80 điểm) Cần đào tạo lại (60 - 79 điểm) Không đạt (< 60 điểm) · `assessInputResult`; lựa chọn: Đạt tiêu chuẩn (≥ 80 điểm), Cần đào tạo lại (60 - 79 điểm), Không đạt (< 60 điểm)
- [ ] L900 · **textarea** · Nhận xét chi tiết... · `assessInputNote`
- [ ] L904 · **button** · Lưu và gửi thông báo · `btnSendAssessNotify`
- [ ] L906 · **button** · Hủy · `btnDismissAssessmentModal`
- [ ] L907 · **button** · Lưu kết quả · `btnSaveAssessment`

#### leaveSwapModalOverlay — 20
- [ ] L920 · **button** · Đóng · `btnCancelLeaveSwapModal`
- [ ] L925 · **button** · Xin nghỉ phép · `btnTabModeLeave`
- [ ] L927 · **button** · Đề xuất đổi ca · `btnTabModeSwap`
- [ ] L935 · **select** · (không có nhãn hiển thị) · `leaveInputStaff`
- [ ] L941 · **select** · Nghỉ phép năm Nghỉ ốm và khám bệnh Việc riêng gia đình Nghỉ không lương · `leaveInputType`; lựa chọn: Nghỉ phép năm, Nghỉ ốm và khám bệnh, Việc riêng gia đình, Nghỉ không lương
- [ ] L953 · **input / date** · (không có nhãn hiển thị) · `leaveInputStartDate`
- [ ] L957 · **input / date** · (không có nhãn hiển thị) · `leaveInputEndDate`
- [ ] L964 · **select** · Cả ngày (Tất cả ca) Ca sáng (08:00 - 12:00) Ca chiều (13:00 - 17:00) Ca tối (17:30 - 21:30) Ca  · `leaveInputScope`; lựa chọn: Cả ngày (Tất cả ca), Ca sáng (08:00 - 12:00), Ca chiều (13:00 - 17:00), Ca tối (17:30 - 21:30), Ca khuya (22:00 - 06:00)
- [ ] L974 · **select** · -- Chưa có người thay -- · `leaveInputReplacement`; lựa chọn: -- Chưa có người thay --
- [ ] L983 · **input / text** · Ghi rõ lý do xin nghỉ phép... · `leaveInputReason`
- [ ] L992 · **select** · (không có nhãn hiển thị) · `swapInputStaffFrom`
- [ ] L998 · **select** · (không có nhãn hiển thị) · `swapInputStaffTo`
- [ ] L1007 · **input / date** · (không có nhãn hiển thị) · `swapInputDateFrom`
- [ ] L1011 · **select** · Ca sáng (08:00 - 12:00) Ca chiều (13:00 - 17:00) Ca tối (17:30 - 21:30) Ca khuya (22:00 - 06:00 · `swapInputShiftFrom`; lựa chọn: Ca sáng (08:00 - 12:00), Ca chiều (13:00 - 17:00), Ca tối (17:30 - 21:30), Ca khuya (22:00 - 06:00)
- [ ] L1023 · **input / date** · (không có nhãn hiển thị) · `swapInputDateTo`
- [ ] L1027 · **select** · Ca sáng (08:00 - 12:00) Ca chiều (13:00 - 17:00) Ca tối (17:30 - 21:30) Ca khuya (22:00 - 06:00 · `swapInputShiftTo`; lựa chọn: Ca sáng (08:00 - 12:00), Ca chiều (13:00 - 17:00), Ca tối (17:30 - 21:30), Ca khuya (22:00 - 06:00), Trực hộ (Không nhận ca bù)
- [ ] L1039 · **input / text** · Ghi rõ lý do cần đổi ca... · `swapInputReason`
- [ ] L1048 · **button** · Hủy · `btnDismissLeaveSwapModal`
- [ ] L1050 · **button** · Lưu đơn chờ duyệt · `btnSubmitLeavePending`
- [ ] L1051 · **button** · Duyệt ngay và áp dụng · `btnApproveLeaveImmediately`

#### leaveRequestsTrayModal — 7
- [ ] L1064 · **button** · Đóng · `btnCancelLeaveRequestsTray`
- [ ] L1069 · **button** · Tất cả · `btnFilterReqAll`
- [ ] L1070 · **button** · Chờ duyệt ( 0 ) · `btnFilterReqPending`
- [ ] L1071 · **button** · Đã duyệt · `btnFilterReqApproved`
- [ ] L1072 · **button** · Từ chối · `btnFilterReqRejected`
- [ ] L1074 · **button** · Tạo đơn mới · `btnOpenLeaveModalFromTray`
- [ ] L1082 · **button** · Đóng · `btnDismissLeaveRequestsTray`

#### reassignModalOverlay — 4
- [ ] L1094 · **button** · Đóng · `btnCancelReassignModal`
- [ ] L1120 · **select** · (không có nhãn hiển thị) · `reassignSelectAllStaff`
- [ ] L1126 · **button** · Bỏ qua (chỉ khóa KTV) · `btnDismissReassignModal`
- [ ] L1127 · **button** · Xác nhận chuyển giao ca · `btnConfirmReassign`

#### incidentReportModalOverlay — 9
- [ ] L1139 · **button** · Đóng · `btnCancelIncidentModal`
- [ ] L1145 · **select** · (không có nhãn hiển thị) · `incidentInputStaff`
- [ ] L1151 · **select** · (không có nhãn hiển thị) · `incidentInputBooking`
- [ ] L1160 · **select** · Phát hiện vết thương hoặc bệnh ngoài da cũ Bé nhút nhát hoặc lông rối cần thêm thời gian Bé hun · `incidentInputType`; lựa chọn: Phát hiện vết thương hoặc bệnh ngoài da cũ, Bé nhút nhát hoặc lông rối cần thêm thời gian, Bé hung dữ cần 2 nhân sự phối hợp an toàn, Sự cố thiết bị hoặc dụng c
- [ ] L1169 · **select** · Đúng giờ (Không gia hạn) +15 phút (Gia hạn hoàn tất) +30 phút (Gia hạn hoàn tất) +45 phút (Gia  · `incidentInputExtend`; lựa chọn: Đúng giờ (Không gia hạn), +15 phút (Gia hạn hoàn tất), +30 phút (Gia hạn hoàn tất), +45 phút (Gia hạn hoàn tất)
- [ ] L1180 · **select** · Lưu ý nội bộ ca trực Thông báo trước cho khách hàng khi đến đón Chuyển quản lý hoặc lưu vết bảo · `incidentInputSeverity`; lựa chọn: Lưu ý nội bộ ca trực, Thông báo trước cho khách hàng khi đến đón, Chuyển quản lý hoặc lưu vết bảo vệ cửa hàng
- [ ] L1189 · **textarea** · Ghi nhận rõ tình trạng của bé cưng, vị trí nấm/vết thương hoặc lưu ý phối hợp an toàn... · `incidentInputNote`
- [ ] L1193 · **button** · Hủy · `btnDismissIncidentModal`
- [ ] L1194 · **button** · Lưu biên bản và cập nhật tiến độ · `btnSaveIncidentReport`

#### modalConfirmStaffAction — 3
- [ ] L1216 · **button** · Đóng · `btnCloseConfirmStaffModal`
- [ ] L1224 · **button** · Hủy · `btnCancelStaffConfirm`
- [ ] L1225 · **button** · Đồng ý · `btnAcceptStaffConfirm`

### Điều khiển sinh động từ JavaScript

- [ ] `pages/admin/admin.js:284` · return '<button type="button" class="header-subtab-btn ${isActive ? 'active' : ''}" data-subtab="${s.id}" data-tab="${s.id}">${s.label}</button>${divider}';
- [ ] `pages/admin/admin.js:875` · btn = document.createElement('button');
- [ ] `pages/admin/admin.js:912` · const button = document.createElement('button');
- [ ] `pages/admin/admin.js:938` · const button = document.createElement('button');
- [ ] `pages/admin/modules/chatbot/chatbot.js:570` · &lt;button type="button" class="header-subtab-btn ${activeTabId === 'tab-live-support' ? 'active' : ''}" data-subtab="tab-live-support" data-tab="tab-live-support">Trực chat</button>
- [ ] `pages/admin/modules/chatbot/chatbot.js:572` · &lt;button type="button" class="header-subtab-btn ${activeTabId === 'tab-ai-copilot' ? 'active' : ''}" data-subtab="tab-ai-copilot" data-tab="tab-ai-copilot">Trợ lý AI</button>
- [ ] `pages/admin/modules/chatbot/chatbot.js:574` · &lt;button type="button" class="header-subtab-btn ${activeTabId === 'tab-chatbot-rules' ? 'active' : ''}" data-subtab="tab-chatbot-rules" data-tab="tab-chatbot-rules">Quy định</button
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:412` · &lt;button type="button" class="btn-card-action btn-jump-pawpoint">Xem ví Pawpoint</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:432` · &lt;button type="button" class="btn-card-action btn-jump-ticket" data-id="${msg.ticketData.id}">Mở vé trong Khiếu nại</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:540` · &lt;button type="button" class="btn-toxic-dots" title="Màng lọc: ${levelLabel}">•••</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:542` · &lt;button type="button" class="toxic-dots-item ${level === 'full' ? 'active' : ''}" data-level="full">Che toàn bộ</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:543` · &lt;button type="button" class="toxic-dots-item ${level === 'words' ? 'active' : ''}" data-level="words">Che từ nhạy cảm</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:544` · &lt;button type="button" class="toxic-dots-item ${level === 'raw' ? 'active' : ''}" data-level="raw">Hiện gốc</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:666` · recentOrderEl.innerHTML = '<a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${currentConversation.recentOrder.id}">${currentConversation.recentOrder.id}<
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:674` · recentBookingEl.innerHTML = '<a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${currentConversation.recentBooking.id}">${currentConversation.recentBook
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:686` · el.innerHTML = '<a href="javascript:void(0)" class="user-name-link btn-jump-ticket" data-id="${t.id}">${t.id}</a>: ${t.title}';
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js:1486` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-apply-canned-response" data-content="${item.content.replace(/"/g, '&quot;')}" style="padding: 5px 14px; font-size: 12
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:128` · html += '<button type="button" class="rules-page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&lt;</button>';
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:132` · html += '<button type="button" class="rules-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:138` · html += '<button type="button" class="rules-page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&gt;</button>';
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:202` · &lt;button type="button" class="rules-action-menu-btn" data-faq-id="${item.id}" title="Thao tác">•••</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:372` · &lt;button type="button" class="rules-action-menu-btn" data-prof-id="${item.id}" title="Thao tác">•••</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:528` · &lt;button type="button" class="rules-action-menu-btn" data-canned-id="${item.id}" title="Thao tác">•••</button>
- [ ] `pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js:868` · const btn = document.createElement('button');
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-detail.js:136` · &lt;a href="${ev.url}" target="_blank" style="display: inline-block; margin-right: 8px;">
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-orders.js:34` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>';
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-orders.js:38` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-orders.js:42` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>';
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-orders.js:125` · &lt;button type="button" id="btnResetOrderComplaintFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; paddi
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-orders.js:174` · &lt;a href="javascript:void(0)" class="user-link-text btn-open-order-complaint-detail" data-ticket-id="${item.id}">${item.id}</a>
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-orders.js:195` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-order-complaint-detail" data-ticket-id="${item.id}">Xử lý</button>
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-services.js:46` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>';
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-services.js:50` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-services.js:54` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>';
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-services.js:161` · &lt;button type="button" id="btnResetServiceComplaintFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; pad
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-services.js:199` · &lt;a href="javascript:void(0)" class="user-link-text btn-open-complaint-detail" data-ticket-id="${item.id}">${item.id}</a>
- [ ] `pages/admin/modules/complaints/subtabs/tab-complaint-services.js:225` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-complaint-detail" data-ticket-id="${item.id}">Xử lý</button>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:88` · html += '<button type="button" class="pagination-btn ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>';
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:92` · html += '<button type="button" class="pagination-btn ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:96` · html += '<button type="button" class="pagination-btn ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>';
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:217` · &lt;button type="button" id="btnResetCustomerFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:274` · &lt;a href="javascript:void(0)" class="user-name-link btn-open-profile-drawer" data-id="${c.id}">${c.name}</a>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:288` · &lt;button type="button" class="btn-action-more" data-id="${c.id}" title="Tác vụ">•••</button>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:356` · &lt;button type="button" class="dropdown-item" data-action="profile">
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:359` · &lt;button type="button" class="dropdown-item" data-action="edit">
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:362` · &lt;button type="button" class="dropdown-item" data-action="adjust-points">
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-list.js:365` · &lt;button type="button" class="dropdown-item" data-action="toggle-lock">
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js:49` · pager.innerHTML = filtered.length > 0 ? '<button type="button" class="pagination-btn" ${pawpointCurrentPage === 1 ? 'disabled' : ''} data-pawpoint-page="prev">&lt;</button>${Array.
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:74` · &lt;button type="button" class="btn-pet-action btn-pet-view-profile admin-badge badge-neutral" data-pet-id="${pet.id \|\| ('PET-' + (idx+1))}" data-pet-name="${pet.name}">Xem hồ sơ bé
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:75` · &lt;button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${custId}" data-pet-index="${idx}">Sửa</button>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:76` · &lt;button type="button" class="btn-pet-action btn-pet-delete" data-cust-id="${custId}" data-pet-index="${idx}">Xóa</button>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:203` · &lt;a href="javascript:void(0)" class="user-name-link btn-jump-order-code" data-order-id="${ord.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${ord
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:209` · &lt;td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${ord.id}">Xem chi tiết đơn</button></td>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:254` · &lt;td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-booking-action" data-booking-id="${b.id}">Xem nhật ký</button></td>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:287` · &lt;td><button type="button" class="admin-btn admin-btn-primary btn-sm btn-view-ticket-action" data-ticket-id="${c.id}">Mở Ticket xử lý</button></td>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:370` · authStatusEl.innerHTML = '<span class="admin-badge ${authBadgeClass}">${data.status === 'LOCKED' ? 'Tài khoản bị khóa' : (data.status === 'TEMP' ? 'Tài khoản tạm' : 'Đang hoạt động
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:436` · &lt;input type="radio" name="default_address_radio" value="${index}" ${item.isDefault ? 'checked' : ''}>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:442` · &lt;button type="button" class="btn-remove-address" data-index="${index}">Xóa</button>
- [ ] `pages/admin/modules/customers/subtabs/tab-customer-profile.js:445` · &lt;input type="text" class="admin-input address-input-val" value="${item.address}" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP..." required>
- [ ] `pages/admin/modules/dashboard/dashboard.js:341` · &lt;button type="button" class="dashboard-stock-row" data-sku="${prod.sku}" data-dashboard-module="Bán hàng">
- [ ] `pages/admin/modules/dashboard/dashboard.js:572` · &lt;button type="button" class="dashboard-booking-row" data-booking-idx="${idx}">
- [ ] `pages/admin/modules/dashboard/dashboard.js:638` · return '<button type="button" class="dashboard-week-heading-btn ${key === toDateKey(selectedDate) ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" data-calendar-date="${key}" ar
- [ ] `pages/admin/modules/dashboard/dashboard.js:664` · return '<button type="button" class="dashboard-calendar-day dashboard-week-day ${selected ? 'is-selected' : ''} ${key === toDateKey(today) ? 'is-today' : ''}" data-calendar-date="$
- [ ] `pages/admin/modules/dashboard/dashboard.js:725` · return '<button type="button" class="${classes}" style="${styleAttrs}" data-dashboard-module="Dịch vụ" data-booking-id="${b.id \|\| ''}">
- [ ] `pages/admin/modules/dashboard/dashboard.js:775` · return '<button type="button" class="${classes}" data-calendar-date="${key}" aria-label="${label}${todayText}${hasAppointments ? ', có lịch hẹn' : ''}" aria-pressed="${key === toDa
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:72` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openCancelModal('${order.id}')" style="color: #DC2626;">Hủy đơn</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:73` · &lt;button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.confirmOrder('${order.id}')">Xác nhận đơn</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:77` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printPackingSlip('${order.id}')">In phiếu đóng gói</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:78` · &lt;button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Bàn giao vận chuyển</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:82` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Cập nhật vận đơn</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:83` · &lt;button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeDelivery('${order.id}')">Đã giao hàng thành công</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:88` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Xác nhận thu tiền</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:92` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:96` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:97` · &lt;button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeOrder('${order.id}')">Hoàn tất đơn hàng</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:102` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:106` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printInvoice('${order.id}')">In hóa đơn</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:107` · &lt;button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-detail.js:129` · &lt;button type="button" class="btn-rma-link-complaint" onclick="PawpalOrdersModule.openComplaintModule('${rma.id}')">Xem hồ sơ tại phân hệ Khiếu nại -></button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:43` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:47` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:51` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:240` · &lt;button type="button" id="btnResetOrderFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:303` · &lt;input type="checkbox" class="admin-checkbox order-row-checkbox" data-id="${o.id}" ${isChecked ? 'checked' : ''} onclick="PawpalOrdersModule.toggleSelectOrder(event, '${o.id}')">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:306` · &lt;a href="javascript:void(0)" class="order-code-link" onclick="PawpalOrdersModule.openOrderDetail('${o.id}')">${o.id}</a>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:332` · &lt;button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openActionDropdown(event, '${o.id}')">•••</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:524` · &lt;button type="button" class="btn-qty-mini" aria-label="Giảm số lượng" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty - 1})">−</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:526` · &lt;button type="button" class="btn-qty-mini" aria-label="Tăng số lượng" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty + 1})">+</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:531` · &lt;button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removePosCartItem(${idx})">&times;</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:1679` · &lt;input type="checkbox" class="admin-checkbox rma-item-select-checkbox" data-sku="${p.sku}" data-price="${p.price}" checked>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-list.js:1687` · &lt;input type="number" class="admin-input rma-item-qty-input" value="${p.quantity}" min="1" max="${p.quantity}" data-max="${p.quantity}" style="width: 54px; height: 28px; text-align:
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:130` · &lt;a href="javascript:void(0)" class="prod-title" onclick="PawpalOrdersModule.openEditProductModal('${p.sku}')">${p.name}</a>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:150` · &lt;button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openStockActionMenu(event, '${p.sku}')">•••</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:172` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:176` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:180` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:241` · &lt;input type="number" class="admin-input" value="${item.qty}" min="1" style="width: 75px; height: 28px; text-align: center; padding: 2px;" onchange="PawpalOrdersModule.updateGrnItem
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:244` · &lt;input type="number" class="admin-input" value="${item.price}" min="0" step="5000" style="width: 110px; height: 28px; text-align: right; padding: 2px 6px;" onchange="PawpalOrdersMo
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:248` · &lt;button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removeGrnItem(${idx})">Xóa</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:281` · chip.innerHTML = '${tag} <button type="button" class="btn-remove-tag" onclick="PawpalOrdersModule.removeTagValue(${group}, ${idx})">&times;</button>';
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:433` · &lt;input type="text" class="admin-input variant-sku-input" value="${autoSku}" placeholder="SKU biến thể" style="height: 28px; font-size: 11.5px; padding: 0 6px; font-family: monospac
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:436` · &lt;input type="number" class="admin-input variant-cost-input" value="${autoCost}" placeholder="Vốn (đ)" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:439` · &lt;input type="number" class="admin-input variant-price-input" value="${autoPrice}" placeholder="Bán (đ)" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:442` · &lt;input type="number" class="admin-input variant-orig-input" value="${autoOrig}" placeholder="Gốc (đ)" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:445` · &lt;input type="number" class="admin-input variant-stock-input" value="${autoStock}" placeholder="Tồn" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:448` · &lt;input type="text" class="admin-input variant-img-input" value="${autoImg}" placeholder="Đường dẫn ảnh" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:475` · &lt;button type="button" onclick="PawpalOrdersModule.removeProductImageAtIndex(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.55); color: #FFF; bor
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1434` · &lt;input type="number" class="admin-input stk-count-input" value="${p.stock}" min="0" style="width: 70px; height: 28px; text-align: center; font-weight: 700; padding: 2px;" oninput="
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1438` · &lt;select class="admin-select stk-row-reason-select" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1598` · &lt;button type="button" style="${getChipStyle(activeReviewsFilter === 'ALL')}" onclick="PawpalOrdersModule.setProductReviewsFilter('ALL')">Tất cả (${reviews.length})</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1599` · &lt;button type="button" style="${getChipStyle(activeReviewsFilter === '5')}" onclick="PawpalOrdersModule.setProductReviewsFilter('5')">5 ★ (${count5})</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1600` · &lt;button type="button" style="${getChipStyle(activeReviewsFilter === '4')}" onclick="PawpalOrdersModule.setProductReviewsFilter('4')">4 ★ (${count4})</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1601` · &lt;button type="button" style="${getChipStyle(activeReviewsFilter === 'MEDIA')}" onclick="PawpalOrdersModule.setProductReviewsFilter('MEDIA')">Có ảnh (${countMedia})</button>
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1637` · &lt;input type="text" class="admin-input" id="replyInput_${r.id}" placeholder="Nhập nội dung phản hồi cho khách hàng..." style="height: 30px; font-size: 12px;">
- [ ] `pages/admin/modules/orders/subtabs/tab-order-products.js:1638` · &lt;button type="button" class="admin-btn admin-btn-primary" style="height: 30px; font-size: 12px; padding: 0 12px; white-space: nowrap;" onclick="PawpalOrdersModule.submitProductRevi
- [ ] `pages/admin/modules/orders/subtabs/tab-order-promos.js:96` · &lt;button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openVoucherActionModal('${v.code}')">•••</button>
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-carelog.js:48` · pager.innerHTML = '<button type="button" class="btn-pagination" data-page="${currentPage-1}" ${currentPage===1?'disabled':''}>&lt;</button>' + Array.from({length:pages},(_,i)=>'<bu
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:44` · &lt;button type="button" class="dropdown-item" data-action="profile">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:47` · &lt;button type="button" class="dropdown-item" data-action="weigh">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:50` · &lt;button type="button" class="dropdown-item" data-action="print">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:53` · &lt;button type="button" class="dropdown-item" data-action="service">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:57` · &lt;button type="button" class="dropdown-item text-success" data-action="restore">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:61` · &lt;button type="button" class="dropdown-item text-danger" data-action="archive">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:162` · const btn = document.createElement('button');
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:298` · &lt;button type="button" id="btnResetPetFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; 
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:338` · &lt;a href="javascript:void(0)" class="pet-name-link btn-open-pet-drawer" data-id="${pet.code}">${pet.name}</a>
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:345` · &lt;a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${pet.custId \|\| 'CUST-001'}">${pet.ownerName \|\| 'Chủ nuôi'}</a>
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:353` · &lt;button type="button" class="btn-action-more" data-id="${pet.code}" title="Tác vụ">•••</button>
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:775` · &lt;button type="button" class="btn-clear-selected-new-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cursor: pointer; padding: 0 4px; font-weight: 6
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-list.js:1054` · &lt;button type="button" class="btn-clear-selected-new-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cursor: pointer; padding: 0 4px; font-weight: 6
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-profile.js:121` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-carelog-modal" data-care-id="${c.careId \|\| 'CL-001'}">Xem chi tiết</button>
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-profile.js:158` · &lt;a href="javascript:void(0)" class="user-name-link btn-jump-service-booking" data-booking-id="${h.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-profile.js:325` · &lt;button type="button" class="btn-clear-selected-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cursor: pointer; padding: 0 4px; font-weight: 600;"
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-profile.js:694` · &lt;button type="button" class="btn-clear-selected-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cursor: pointer; padding: 0 4px; font-weight: 600;"
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-reminders.js:94` · const btn = document.createElement('button');
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-reminders.js:171` · &lt;a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${item.custId}">${item.ownerName}</a>
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-reminders.js:187` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-reminder-modal"
- [ ] `pages/admin/modules/pets/subtabs/tab-pet-reminders.js:194` · &lt;button type="button" class="admin-btn admin-btn-primary btn-sm btn-quick-book-spa"
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:52` · &lt;button type="button" class="dropdown-item" data-action="view-detail">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:59` · &lt;button type="button" class="dropdown-item" data-action="confirm-booking">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:62` · &lt;button type="button" class="dropdown-item text-danger" data-action="cancel-booking">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:68` · &lt;button type="button" class="dropdown-item" data-action="intake-safety">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:71` · &lt;button type="button" class="dropdown-item" data-action="add-surcharge">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:74` · &lt;button type="button" class="dropdown-item" data-action="change-staff">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:77` · &lt;button type="button" class="dropdown-item text-danger" data-action="cancel-booking">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:83` · &lt;button type="button" class="dropdown-item" data-action="add-surcharge">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:86` · &lt;button type="button" class="dropdown-item text-success" data-action="complete-booking">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:89` · &lt;button type="button" class="dropdown-item" data-action="escalate-complaint">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:95` · &lt;button type="button" class="dropdown-item" data-action="escalate-complaint">
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:285` · &lt;button type="button" id="btnResetServiceFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:352` · : '<button type="button" class="btn-table-action-inline btn-assign-staff-inline" data-booking-id="${item.id}" style="color: #B45309; background: none; border: none; font-weight: 60
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:359` · &lt;a href="javascript:void(0)" class="user-name-link btn-view-booking-detail" data-booking-id="${item.id}">${item.id}</a>
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:391` · &lt;button type="button" class="btn-booking-action-more" data-booking-id="${item.id}" title="Tác vụ">•••</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:414` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>';
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:418` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:422` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>';
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:1634` · &lt;button type="button" class="btn-clear-selection" style="background: none; border: none; color: #236B48; font-size: 12px; cursor: pointer; font-weight: 600; padding: 0 4px;">✕ Bỏ c
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:1730` · &lt;button type="button" class="btn-clear-selection" style="background: none; border: none; color: #236B48; font-size: 12px; cursor: pointer; font-weight: 600; padding: 0 4px;">✕ Bỏ c
- [ ] `pages/admin/modules/services/subtabs/tab-service-bookings.js:1854` · &lt;button type="button" class="btn-clear-selection" style="background: none; border: none; color: #236B48; font-size: 12px; cursor: pointer; font-weight: 600; padding: 0 4px;">✕ Bỏ c
- [ ] `pages/admin/modules/services/subtabs/tab-service-catalog.js:40` · &lt;button type="button" class="btn-remove-pet-type-tag" data-tag="${tag}" style="background: none; border: none; color: #236B48; cursor: pointer; padding: 0 2px; font-size: 12px; fon
- [ ] `pages/admin/modules/services/subtabs/tab-service-catalog.js:231` · &lt;button type="button" class="btn-remove-sop-step" data-step-index="${idx}" style="background: none; border: none; color: #DC2626; font-size: 12px; font-weight: 500; cursor: pointer
- [ ] `pages/admin/modules/services/subtabs/tab-service-catalog.js:326` · &lt;button type="button" class="btn-view-sop-pill btn-view-service-sop" data-service-code="${svc.code \|\| svc.id}" title="Xem quy trình chuẩn SOP">${stepCount} bước</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-catalog.js:335` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-edit-catalog-service" data-service-code="${svc.code \|\| svc.id}">Sửa</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:62` · &lt;button type="button" class="admin-btn admin-btn-primary btn-action-confirm" data-booking-id="${booking.id}">Xác nhận lịch</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:63` · &lt;button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch hẹn</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:67` · &lt;button type="button" class="admin-btn admin-btn-primary btn-action-intake" data-booking-id="${booking.id}">Tiếp nhận bé</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:68` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:69` · &lt;button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:73` · &lt;button type="button" class="admin-btn admin-btn-primary btn-action-complete" data-booking-id="${booking.id}">Hoàn thành dịch vụ</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:74` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:75` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:79` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</button>
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:394` · &lt;button type="button" class="btn-del-accompanying" data-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: pointer; font-size: 12px; padding: 0 4px;" title
- [ ] `pages/admin/modules/services/subtabs/tab-service-detail.js:425` · &lt;button type="button" class="btn-del-surcharge-item" data-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: pointer; font-size: 12px; padding: 0 4px;" tit
- [ ] `pages/admin/modules/services/subtabs/tab-service-reviews.js:183` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reply-review" data-review-id="${r.id}" style="padding: 4px 10px; font-size: 12px;">
- [ ] `pages/admin/modules/services/subtabs/tab-service-reviews.js:217` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>';
- [ ] `pages/admin/modules/services/subtabs/tab-service-reviews.js:221` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/services/subtabs/tab-service-reviews.js:225` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>';
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-audit.js:15` · el.innerHTML = '<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-p="prev">&lt;</button>${Array.from({length: totalPages}, (_, i) => '<button class="pagination-bt
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:117` · el.innerHTML = '<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-p="prev">&lt;</button>${Array.from({length: totalPages}, (_, i) => '<button class="pagination-bt
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:144` · ? '<button type="button" class="banner-action-btn btn-extend-banner" data-id="${b.id}">Gia hạn 30 ngày</button>'
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:158` · &lt;button type="button" class="banner-action-btn btn-edit-banner" data-id="${b.id}">Sửa</button>
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:159` · &lt;button type="button" class="banner-action-btn btn-delete-banner" data-id="${b.id}">Xóa</button>
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:161` · &lt;button type="button" class="banner-action-btn btn-toggle-banner ${b.status === 'active' ? 'is-pause' : 'is-enable'}" data-id="${b.id}">${b.status === 'active' ? 'Tắt' : 'Bật'}</bu
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:313` · if (nums) nums.innerHTML = Array.from({ length: totalVoucherPages }, (_, i) => '<button type="button" class="pagination-btn ${i + 1 === voucherPage ? 'active' : ''}" data-voucher-p
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:371` · &lt;button type="button" class="btn-dots-action btn-voucher-dots" data-code="${v.code}" title="Tác vụ">•••</button>
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:436` · &lt;button type="button" class="btn-notice-action btn-toggle-notice" data-id="${n.id}">${n.isActive ? 'Tắt' : 'Bật'}</button>
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-banners.js:437` · &lt;button type="button" class="btn-notice-action btn-delete-notice" data-id="${n.id}">Xóa</button>
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-content.js:91` · if (nums) nums.innerHTML = Array.from({ length: totalPages }, (_, i) => '<button type="button" class="pagination-btn ${i + 1 === currentArticlePage ? 'active' : ''}" data-article-p
- [ ] `pages/admin/modules/settings/subtabs/tab-settings-content.js:138` · &lt;button type="button" class="btn-action-trigger btn-article-more" data-id="${a.id}" title="Tác vụ bài viết">•••</button>
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-assessment.js:27` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Trang trước">&lt;</button>';
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-assessment.js:31` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-assessment.js:35` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Trang sau">&gt;</button>';
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-assessment.js:133` · &lt;button type="button" class="btn-action-trigger btn-reassess-trigger" data-staff-id="${item.staff_id \|\| ''}" style="border: none; background: none; color: #236B48; cursor: pointe
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:111` · html += '<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Trang trước">&lt;</button>';
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:115` · html += '<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>';
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:119` · html += '<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Trang sau">&gt;</button>';
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:185` · &lt;button type="button" id="btnResetStaffFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:232` · &lt;td><a href="javascript:void(0)" class="user-link-text btn-view-profile" data-id="${staff.id}" title="${escapeHtml(staff.name)}">${escapeHtml(staff.name)}</a></td>
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:244` · &lt;button class="btn-action-trigger btn-staff-action" data-id="${staff.id}">•••</button>
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-list.js:493` · &lt;select class="admin-select reassign-select-row" data-booking-id="${b.id}" style="height: 32px; padding: 2px 8px; font-size: 12px;">
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-schedule.js:87` · &lt;button type="button" class="btn-edit-shift" data-staff-id="${staff.id}" style="margin-left: 6px; background: none; border: none; color: #236B48; text-decoration: underline; font-s
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-schedule.js:212` · &lt;button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reject-req" data-id="${req.id}" style="border-color: #F7DCDC; color: #DC2626; height: 28px; padding: 0 10px; f
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-schedule.js:213` · &lt;button type="button" class="admin-btn admin-btn-primary btn-sm btn-approve-req" data-id="${req.id}" style="height: 28px; padding: 0 10px; font-size: 12px;">Duyệt đơn</button>
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-schedule.js:326` · &lt;button type="button" class="btn-shift-action btn-add-to-shift" data-id="${s.id}">Thêm</button>
- [ ] `pages/admin/modules/staff/subtabs/tab-staff-schedule.js:343` · &lt;button type="button" class="btn-shift-action btn-remove-from-shift" data-id="${s.id}" style="border-color: #F7DCDC; color: #DC2626;">Bỏ</button>


### Đăng nhập Admin — 7 điều khiển

- [ ] L25 · **input** · ten.nv@pawpal.vn · `inputAdminEmail`
- [ ] L31 · **input** · •••••••• · `inputAdminPassword`
- [ ] L32 · **button** · Hiện · `btnTogglePasswordView`
- [ ] L36 · **button** · Đăng nhập hệ thống · `btnSubmitAdminLogin`
- [ ] L44 · **a** · Đăng nhập tại cổng khách hàng · `/login`
- [ ] L57 · **input** · Tối thiểu 6 ký tự · `inputNewPassword`
- [ ] L62 · **input** · Nhập lại mật khẩu mới · `inputConfirmPassword`
- [ ] L65 · **button** · Lưu mật khẩu và vào hệ thống · `btnSubmitChangePass`

### Vùng bấm không dùng thẻ button — 2 điều khiển

- [ ] `pages/admin/modules/orders/orders.html:1386` · **div** · `attr1TagBox` · bấm để focus ô nhập con; thử cả chuột và bàn phím.
- [ ] `pages/admin/modules/orders/orders.html:1401` · **div** · `attr2TagBox` · bấm để focus ô nhập con; thử cả chuột và bàn phím.

## Tiêu chí hoàn tất

- [ ] Mọi dòng điều khiển ở trên đã được thử trong trạng thái xuất hiện thực tế và ghi kết quả đạt/lỗi.
- [ ] Mọi luồng ở đầu tài liệu chạy trọn vẹn; các thay đổi đọc lại đúng từ Supabase sau F5.
- [ ] Không còn màn hình trống sau tải, dữ liệu bị mất, modal kẹt, nút không phản hồi, nội dung bảng tràn hoặc lỗi console/network chưa phân loại.
