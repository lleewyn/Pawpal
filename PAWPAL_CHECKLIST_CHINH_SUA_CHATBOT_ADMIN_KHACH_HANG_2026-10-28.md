# Checklist chatbot Admin và khách hàng

Cập nhật01/11/2026. Đây là danh sách công việc hiện hành. Dấu[x] chỉ xác nhận phần ghi rõ trong mục đó; kiểm thử local, smoke Cloud và nghiệm thu Production là các mức khác nhau.

**Admin đã push main003d5e85 và kiểm Vercel theo [file công việc riêng](PAWPAL_HOAN_THIEN_CHATBOT_ADMIN.md).**213 test tự động local đạt; Vercel24/24 câu browser, tab Trực chat/Quy định và chặn401 khi chưa đăng nhập đạt. SQL162–164 đã áp dụng; Gate2 về tổng lưu lượng/tải nhiều phiên vẫn mở. [Báo cáo Vercel Admin](docs/chatbot/admin-vercel-2026-11-01/README.md). Thành viên đã phát hành9b5e0ccd và kiểmVercel10 nhóm cùng hai tài khoản thật; [báo cáo thành viên](docs/chatbot/member-vercel-2026-11-01/README.md).

**Guest đã đạt nghiệm thu local đợt2 và push main556729ad:**31 câu hỏi khác nhau, hai câu Gemini được duyệt, bốn link bấm đi tiếp, phục hồi mạng/nháp và vòng hai UI chuyển nhân viên/CSAT.43 test tự động đạt. Vercel mới đã smoke mua guest và giá cắt tỉa desktop/mobile; chưa lặp toàn bộ matrix trênProduction. Gate2 và dữ liệu riêng thành viên vẫn mở. [Kết quả và lỗi đã sửa](docs/chatbot/guest-phase2-2026-10-31/README.md).

**Bổ sung UI trong lần phát hành tiếp theo theo yêu cầu push:** câu hỏi hiện ngay khi gửi, có trạng thái chờ trả lời và nút gửi lại an toàn khi lỗi. Đã thử browser localhost/API thật cùng hồi quy nháp/reload/ownership, không thêm request database hoặc gọi Gemini. [Kết quả](docs/chatbot/guest-phase2-2026-10-31/immediate-send-results.txt).

**Bổ sung streaming trong cùng lần phát hành theo yêu cầu push:** Gemini trả từng đoạn qua SSE, giọng khách hàng xưng PawPal và gọi bạn/bé; FAQ/giá trả trực tiếp.54 test Node và kiểm tra browser local đạt; đúng một câu Gemini đã được duyệt và chạy, kết quả lưu đúng nhưng chưa thu được thời gian từng chunk thật do công cụ. Chưa kiểm buffering Gemini trên Vercel. [Chi tiết](docs/chatbot/guest-phase2-2026-10-31/streaming-and-tone.md).

## 1. Phạm vi cần giữ

| Đối tượng | Được hỏi | Ranh giới |
| --- | --- | --- |
| Admin/nhân viên | Tất cả nhóm nghiệp vụ A01–A19: khách/thú cưng, lịch/Hotel/Taxi, đơn/thanh toán/hoàn tiền, sản phẩm/tồn kho/giá, điểm/ưu đãi, khiếu nại/hội thoại, nhân sự/lịch trực, nội dung/đánh giá, cấu hình và báo cáo | Theo quyền nguồn thực tế. Tra cứu và soạn nháp; không tự ghi nghiệp vụ. Thiếu dữ kiện phải làm rõ hoặc mở màn hình liên quan |
| Khách vãng lai | Mọi thông tin đã công bố: cửa hàng, dịch vụ, giá, sản phẩm, chính sách, cách đặt/mua, Paw Points và hướng dẫn tra cứu | Không chặn chỉ vì chưa đăng nhập. Không xem hồ sơ cá nhân người khác hoặc dữ liệu nội bộ. Tồn hàng/lịch/phòng trống chỉ xác nhận khi có nguồn hiện hành |
| Khách thành viên | Toàn bộ thông tin công khai; mục tiêu tiếp theo là dữ liệu riêng của chính mình: thú cưng, đơn, lịch, điểm/hạng và yêu cầu hỗ trợ | Phải xác minh ownership từng đối tượng. Đăng nhập không cấp quyền xem dữ liệu người khác; không tự ghép giao dịch guest bằng SĐT/email |

Guest chỉ được tra giao dịch riêng khi server xác minh được quyền với đúng giao dịch. Biết mã đơn hoặc SĐT đơn lẻ chưa đủ. Chưa có nguồn thì nói rõ chưa đủ thông tin và đưa bước tiếp theo, không coi đó là thông tin guest bị cấm hỏi.

Danh mục chi tiết: [A01–A19 và ba nhóm người dùng](docs/chatbot/stage0-2026-10-28/capabilities.md), [bộ câu hỏi nghiệm thu](docs/chatbot/stage0-2026-10-28/question-set.md). Danh mục là phạm vi đích, không phải mọi năng lực đã hoàn thành.

## 2. Tiến độ theo giai đoạn

| Giai đoạn | Đã có | Còn thiếu để đóng |
| --- | --- | --- |
| 0 — Baseline | Kiểm kê, danh mục câu hỏi, baseline đọc, ngân sách, backup/rollback | Marker phiên bản API kiểm chứng ở lần phát hành; tải Production không được suy từ fixture |
| 1 — Quyền và hội thoại | Nghiệm thu local JWT/RLS, cạnh tranh/requestId, đổi danh tính, nháp/reload, SLA, handover và CSAT | Migration135 về cap bù điểm chưa áp Cloud; các kết quả local không thay nghiệm thu mọi quyền Production |
| 2 — Nền tảng đọc | Contract, registry đóng, phân trang/cap/timeout/pool và rate theo nhân viên; dependency API đã lênCloud | Gate2: ingress trước Auth, tổng chi phí ngoài source pool và kiểm tra tải dùng chung |
| 3 — Admin từng phân hệ | Gateway hiện hành đã lênCloud;37 kiểm tra SQL toàn registry và smoke Vercel đạt | Oracle rộng, quyền thiếu/khóa trên môi trường triển khai và chất lượng model diện rộng |
| 4 — Liên phân hệ | Hai luồng khách, bảng việc tồn đọng, so sánh thực thu;153/154 đã lênCloud | Tổ hợp mới, oracle tuần/tháng, phân nhóm/chỉ số khác và kiểm tra lỗi từng phần rộng hơn |
| 5 — Thông tin công khai | FAQ tìm theo câu hỏi, giới thiệu gói, giá, chuyển người;150/152/157 đã cập nhật21 trạng thái FAQ trênCloud và kiểm nguồn/UI | Còn dữ kiện kinh doanh, độ liên quan FAQ và chất lượng trả lời; ưu tiên theo file khách vãng lai |
| 6 — Dữ liệu riêng khách | Đã có đơn/lịch/bé/điểm và sáu nhóm sâu, nguồn160/161, phân trang/link,68 test Node; SQL hai danh tính rollback và browser hai tài khoản thật đạt | API/frontend chưa push, smoke Vercel và xác minh giao dịch guest |
| 7 — Chất lượng và tài nguyên | Rules đọc có giới hạn; backoff/cap và các hồi quy đã có | Rules CRUD/conflict, Gemini thật, UI toàn diện, cache/tải toàn hệ thống |
| 8 — Phát hành | Runtime đọc hiện hành đã sửa trênCloud; frontend/API main đã push và smoke Vercel | Tương thích đầy đủ, bộ smoke từng vai trò, marker runtime và theo dõi/rollback |

## 3. Checklist còn phải làm

Chỉ để checkbox cho công việc có thể nghiệm thu. Các nguyên tắc bất biến ở mục4 không lặp lại thành một danh sách việc chưa làm.

### Giai đoạn0–2: nền tảng

- [x] G0 — Có baseline, danh mục năng lực, bộ câu hỏi đầu và hồ sơ backup/rollback. [Bằng chứng](docs/chatbot/stage0-2026-10-28/README.md).
- [x] G1 — Nghiệm thu local quyền/ownership, cạnh tranh, nháp/reload và vòng đời hội thoại. [Bằng chứng và giới hạn](docs/chatbot/stage1-acceptance-2026-10-28/README.md).
- [ ] G1-Cloud — Đối chiếu và phát hành migration135 cho cap bù điểm khi sẵn sàng; không đánh dấu đã áp chỉ vì file có trong repo.
- [x] G2 — Registry/contract và các dependency đọc hiện hành đã có; các hàm giữ quyền nguồn, RLS, cap và timeout. [Sửa runtime API](docs/chatbot/admin-copilot-runtime-repair-2026-10-31/README.md).
- [ ] G2.2 — Đóng Gate2 bằng phép đo tổng lượt Auth/DB/bytes/độ trễ và giới hạn ingress/dùng chung; giữ nguồn lực cho nghiệp vụ chính. Chưa có Redis/proxy limiter ngoài database.

### Giai đoạn3–4: Admin

- [x] G3.1–G3.3 — Có công cụ cho cả nhóm A/B/C theo danh mục hiện hành; không loại các nhóm Admin ít gặp. [Ma trận](docs/chatbot/stage3-matrix-2026-10-29/README.md).
- [x] G3.4-local — Bổ sung SQL oracle Hotel/Taxi, giá theo biên cân/cự ly, lịch buổi sáng, việc chờ và hai luồng cùng khách; kiểm tra thiếu quyền/nhân viên chấm dứt.213 test và24 câu browser mở rộng đạt; không coi là chứng nhận mọi câu hỏi hoặc Production. [Bằng chứng](docs/chatbot/admin-completion-2026-11-01/README.md).
- [ ] G4.1 — Mở rộng liên phân hệ ngoài hai luồng một khách → lịch/phiếu và → thú cưng/đơn mới nhất. Xác định UUID duy nhất; trùng tên phải chọn lại, không ghép theo tên.
- [x] G4.2-oracle — Đã đối chiếu độc lập SQL thực thu ngày/tuần/tháng ở cả hai kỳ theo cùng phần thời gian đã trôi qua; browser tuần/tháng đạt. Chỉ số/phân nhóm khác chờ công thức và nguồn chuẩn. [Oracle mới](docs/chatbot/admin-completion-2026-11-01/source-oracles.txt).
- [ ] G4.3 — Bổ sung ngoại lệ/SLA/ưu tiên theo chính sách thật ngoài đơn hủy còn tiền và lịch confirmed chưa có KTV. Không coi chênh lệch đối soát là khoản hoàn được duyệt.
- [ ] G4.4 — Mở rộng nghiệm thu lỗi từng nguồn/thiếu quyền/UUID lệch/response cũ; giữ phần hợp lệ và nói rõ phần thiếu, không giả số0.

### Giai đoạn5–6: khách hàng

- [x] G5-runtime — Có tìm FAQ công khai, giới thiệu và giá xác định; không từ chối các khái niệm công khai như Paw Points/mã đơn. [Phạm vi guest](docs/chatbot/guest-public-scope-2026-10-30.md).
- [ ] G5.1 — Đo độ liên quan FAQ với bộ câu hỏi tiếng Việt đại diện; so sánh bytes/độ trễ với baseline. Không dùng kết quả “đọc được FAQ” thay chất lượng trả lời.
- [ ] G5.2 —21 trạng thái FAQ150/152/157 đã được đối chiếu và cập nhậtCloud; còn chốt dữ kiện kinh doanh và kiểm tra câu trả lời cuối. Không bịa tồn hàng, phòng/lịch trống, điều kiện ưu đãi, giao nhận hoặc đổi trả. [Kết quả nội dung](docs/chatbot/guest-completion-2026-10-31/README.md).
- [x] G5-handover — Hai giao diện localhost thật đạt guest → Admin nhận/trả lời → guest tự nhận khi mở foreground sau32,3 giây → trả lời ngược Admin → hoàn tất/CSAT. Bước hoàn tất có mở lại widget; không suy ra cập nhật mọi trạng thái khi ẩn tab. [Bằng chứng đợt2](docs/chatbot/guest-phase2-2026-10-31/README.md).
- [x] G6.1–G6.2-local — Thành viên tra đúng đơn/lịch/thú cưng/điểm qua JWT và RLS, nhiều nhóm hỏi chọn, cap5/16KiB và link chi tiết; không dùng Gemini cho dữ liệu riêng. SQL/RLS hai danh tính rollback và browser một thành viên thật đạt. Nguồn160 đã ápCloud, API/frontend còn local. [Bằng chứng và giới hạn](docs/chatbot/member-phase1-2026-10-31/README.md).
- [x] G6.1-release — Đã push9b5e0ccd và smokeVercel10 nhóm qua phiên thành viên thật, đúng nguồncaller-JWT; guest mobile và link chi tiết đơn đạt. Không bao gồm benchmark tải hoặc model streaming Production.
- [x] G6-member-details-local — Nhật ký/Hotel/Taxi, lịch sử điểm, ví ưu đãi và hỗ trợ riêng đã có projection theo đúng chủ, cap5/16KiB, không lộ internal note/không gọi Gemini. SQL161 và browser local đã đạt; trạng thái trống của ba nhóm đúng nguồn tài khoản hiện có. [Báo cáo](docs/chatbot/member-phase2-2026-10-31/README.md).
- [ ] G6.3–G6.4 — Thiết kế/kiểm chứng bằng chứng sở hữu giao dịch guest; chưa đủ thì giữ hướng dẫn công khai và chuyển nhân viên.
- [x] G6.5-member-local — Hai tài khoản QA đăng nhập/đăng xuất/đổi chủ thật, đọc chéo403/rỗng và tài khoản QA bị khóa đã đạt; dữ liệu QA đã dọn. Response cũ có hồi quy kiểm soát transport. Không tự đăng xuất/sửa tài khoản người dùng. Liên kết giao dịch guest vẫn theoG6.3–G6.4, không gộp vào nghiệm thu này.

### Giai đoạn7–8: chất lượng và phát hành

- [ ] G7.1 — Rules CRUD/conflict, hiệu lực chính sách và benchmark; không sửa/xóa quy định kinh doanh thật chỉ để thử giao diện.
- [ ] G7.2 — Mở rộng đánh giá Gemini từng đối tượng. Đợt2 guest đã thử đúng hai câu công khai được duyệt, lịch sử trống, đạt; chưa chứng nhận mọi câu tự do hay Admin/thành viên. Phạm vi duyệt lần này đã sử dụng, không tự gọi thêm.
- [ ] G7.3 — Đo cache/Realtime/request đồng thời và tổng tài nguyên; không coi backoff hoặc rate theo nhân viên là limiter toàn hệ thống.
- [ ] G7.4 — Nghiệm thu UI theo AGENTS.md: lỗi/trống/loading, phân trang, bàn phím, responsive, giữ nháp và không tăng listener/timer khi đổi tab.
- [ ] G7.5 — Ghi nhận câu hỏi chưa đáp ứng ở mức tối thiểu, có giới hạn và không lưu thừa thông tin cá nhân; dùng để ưu tiên mở rộng.
- [ ] G8.1–G8.2 — Chốt tính năng/lỗi còn mở và marker API; kiểm tra đúng migration/API/frontend trước khi phát hành. Chỉ áp các migration đã review, không chạy cả thư mục.
- [ ] G8.3 — Smoke theo từng vai trò trên môi trường phát hành: Admin, guest, thành viên và chuyển người; ghi riêng phần chưa thử.
- [ ] G8.4 — Theo dõi lỗi/chất lượng/tài nguyên và rollback nhóm lỗi; cập nhật checklist theo bằng chứng mới.

## 4. Điều kiện bắt buộc về quyền và tải database

- Supabase là nguồn chuẩn. Không mock/JSON fallback trong runtime, không dùng service role để vượt quyền caller. API công khai chỉ đọc nguồn công khai và hội thoại đã xác minh ownership.
- Không tải toàn bảng hoặc toàn lịch sử cho model lọc; chỉ chọn trường cần, lọc/phân trang/aggregate tại nguồn. Không truy vấn theo từng dòng, ký tự gõ hoặc token AI.
- Admin: tối đa3 nguồn/câu,2 nguồn đồng thời,32KiB/nguồn và64KiB/câu. Hai request slot nặng, bốn source slot và rate10 câu mới/phút/nhân viên dùng chung đã có; Auth/ghi lịch sử/replay/Realtime vẫn tính vào tổng tải.
- Danh sách UI10 dòng/trang; history tải tối đa30 tin/lượt. Truy vấn kỳ trực tiếp tối đa31 ngày theo contract; kỳ dài hơn cần nguồn tổng hợp đã kiểm chứng, không chia nhỏ âm thầm.
- Guest FAQ: tối đa5 mục hoàn chỉnh,16KiB FAQ/32KiB context; lịch sử ngữ cảnh8 tin. Giá công khai tối đa10 mức/16KiB. Không dùng model tự tính tiền hoặc biến giá niêm yết thành báo giá xác nhận.
- Truy vấn nguồn có timeout SQL5 giây/lock1 giây; hết ngân sách trả lỗi/phần hợp lệ, không hàng đợi vô hạn hoặc lặp công cụ. Hủy UI không đồng nghĩa đã dừng SQL.
- Cache có TTL/cap, tách danh tính/quyền/bộ lọc và invalidation; gộp request trùng. Realtime chỉ tải lại phần cần, không thêm subscription/polling toàn bảng cho từng năng lực.
- Widget chỉ đọc nền khi mở/hiển thị và có ca: bình thường tối thiểu30 giây, lỗi tạm thời30/60/120 giây; thiếu RPC/quyền dừng nền. Không tự gửi lại câu hỏi hoặc đổi requestId khi kết quả chưa rõ.
- Không đọc Supabase Cloud Logs. Dùng phản hồi API, truy vấn có phạm vi, metadata và trình duyệt. Thử CRUD/handover chỉ trên dữ liệu kiểm thử có chủ sở hữu, không tác động hồ sơ/giao dịch thật.

## 5. Kiểm thử browser localhost ngày31/10

Đã thực hiện trên `http://localhost:4000`. Giao diện/API chạy local nhưng cấu hình hiện tại dùng Supabase Cloud; không gọi đây là database local hoặc bộ dữ liệu cô lập. Không gọi Gemini, không dùng transport mock trong lượt kiểm tra trực tiếp.

| Luồng | Kết quả cuối |
| --- | --- |
| Admin |14 tình huống đạt: lịch sử, hỏi tồn kho/thực thu, reload, sáu nhóm Quy định, FAQ trống và ba bộ lọc Inbox |
| Guest |8 tình huống đạt: welcome, giới thiệu, ba nhóm giá, ranh giới số dư riêng, nháp và reload |
| Chuyển người |6 tình huống đạt sau sửa nút: guest → Admin nhận/trả lời → hoàn tất → CSAT; chỉ dùng ca kiểm thử của lượt này |

**Tổng28 tình huống đạt.** Có phát hiện/sửa lỗi nút Gặp chuyên viên bị khóa sau trả lời. Thành viên tra dữ liệu riêng, Gemini thật, Rules CRUD và độ trễ cập nhật nền chưa được nghiệm thu trong lượt này. [Kết quả, lỗi trước sửa và giới hạn](docs/chatbot/local-browser-review-2026-10-31/README.md).

## 6. Bằng chứng và lịch sử

- [Lịch sử đầy đủ trước khi lọc](docs/chatbot/archive/checklist-before-cleanup-2026-10-31.md): giữ nguyên các mốc, ID cũ và giới hạn tại thời điểm kiểm tra; không phải tiến độ hiện hành.
- [Runtime Trực chat/Quy định](docs/chatbot/admin-rules-runtime-repair-2026-10-31/README.md), [runtime API Trợ lý AI](docs/chatbot/admin-copilot-runtime-repair-2026-10-31/README.md).
- [FAQ công khai và giới hạn](docs/chatbot/stage5-public-search-2026-10-30/README.md), [nội dung đã phát hành31/10](docs/chatbot/guest-completion-2026-10-31/README.md), [giới thiệu/giá158](docs/chatbot/stage5-service-guidance-2026-10-30/README.md).

Đã bỏ khỏi checklist hiện hành: nhật ký từng lệnh/mốc commit, số lượng test lặp theo ngày, danh sách nguyên tắc gắn checkbox giả như việc chưa làm và các đoạn mô tả trùng nhau. Không loại phạm vi nghiệp vụ đã chốt hoặc xóa bằng chứng cũ.
