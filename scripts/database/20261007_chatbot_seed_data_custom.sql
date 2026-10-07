-- ==============================================================================
-- PAWPAL CHATBOT SEED DATA MIGRATION (CUSTOM SEED FROM SPREADSHEETS)
-- File: scripts/database/20261007_chatbot_seed_data_custom.sql
-- Mô tả: Chuẩn hóa 100% dữ liệu từ các sheet seed_data và nạp vào 9 bảng Supabase.
-- Đã xử lý toàn diện:
-- 1. Nới lỏng ràng buộc Level (1 - 6) cho Cấp độ Đặc thù (Sức khỏe thú cưng & Cấp cứu).
-- 2. Tách nhỏ toàn bộ từ cấm Bảng 3 thành từng dòng độc lập & map Enum (severity, action).
-- 3. Tạo mã slug prompt_key chuẩn cho 20 chỉ thị Bảng 1.
-- 4. Định lượng điểm thưởng & tiền bồi hoàn cho Bảng 9.
-- 5. Map trigger_type và SLA cho Bảng 8.
-- Tuân thủ nghiêm ngặt: AGENTS.md (100% Supabase Live DB - Zero JSON Mock)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- BƯỚC 0: CẬP NHẬT RÀNG BUỘC CHO PHÉP LEVEL 6 & MỞ RỘNG CỘT VĂN BẢN (TEXT)
-- ------------------------------------------------------------------------------
ALTER TABLE public.chatbot_sentiment_tier DROP CONSTRAINT IF EXISTS chatbot_sentiment_tier_level_check;
ALTER TABLE public.chatbot_sentiment_tier ADD CONSTRAINT chatbot_sentiment_tier_level_check CHECK (level BETWEEN 1 AND 6);

ALTER TABLE public.chat_conversation DROP CONSTRAINT IF EXISTS chat_conversation_sentiment_level_check;
ALTER TABLE public.chat_conversation ADD CONSTRAINT chat_conversation_sentiment_level_check CHECK (sentiment_level BETWEEN 1 AND 6);

ALTER TABLE public.chatbot_scenario_matrix DROP CONSTRAINT IF EXISTS chatbot_scenario_matrix_expected_sentiment_check;
ALTER TABLE public.chatbot_scenario_matrix ADD CONSTRAINT chatbot_scenario_matrix_expected_sentiment_check CHECK (expected_sentiment BETWEEN 1 AND 6);

-- Mở rộng các cột VARCHAR ngắn sang TEXT để triệt tiêu lỗi 22001 (value too long)
ALTER TABLE public.chatbot_sentiment_action ALTER COLUMN bot_behavior TYPE TEXT;
ALTER TABLE public.chatbot_handover_rule ALTER COLUMN condition_name TYPE TEXT;
ALTER TABLE public.chatbot_handover_rule ALTER COLUMN threshold_value TYPE TEXT;
ALTER TABLE public.chatbot_handover_rule ALTER COLUMN auto_assign_role TYPE TEXT;
ALTER TABLE public.chatbot_compensation_policy ALTER COLUMN issue_type TYPE TEXT;
ALTER TABLE public.chatbot_scenario_matrix ALTER COLUMN scenario_name TYPE TEXT;
ALTER TABLE public.chatbot_scenario_matrix ALTER COLUMN expected_tool_call TYPE TEXT;
ALTER TABLE public.chatbot_sentiment_trigger ALTER COLUMN context_domain TYPE TEXT;
ALTER TABLE public.chatbot_system_prompt ALTER COLUMN tone_of_voice TYPE TEXT;
ALTER TABLE public.chatbot_system_prompt ALTER COLUMN persona_name TYPE TEXT;


-- ------------------------------------------------------------------------------
-- BẢNG 5: chatbot_sentiment_tier (6 Cấp độ cảm xúc bao gồm Cấp độ Đặc thù)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_sentiment_tier (level, name, color_badge, sla_seconds, description)
VALUES
(1, 'Hài lòng, vui vẻ', '#DCEEE2', 300, 'Khách hàng phấn khởi, tin tưởng, khen ngợi chất lượng dịch vụ hoặc nhân viên. Dễ chuyển đổi thành khách hàng thân thiết.'),
(2, 'Bình thường, trung lập', '#E2ECE5', 180, 'Khách tìm hiểu thông tin, đặt câu hỏi dịch vụ, giá cả, giờ mở cửa. Trạng thái giao tiếp cân bằng, lịch sự.'),
(3, 'Thất vọng, mất kiên nhẫn', '#F5E8D3', 120, 'Khách phàn nàn chờ đợi lâu, ship trễ, thắc mắc lặp lại nhiều lần. Cần trấn an và giải quyết vấn đề nhanh.'),
(4, 'Tức giận cao độ', '#F7DCDC', 60, 'Khách bức xúc mạnh, đòi bồi thường, đòi gặp quản lý, đe dọa bóc phốt. Cần ngừng bán hàng, xin lỗi chân thành và chuyển cấp.'),
(5, 'Mất kiểm soát, thù địch', '#8F2424', 30, 'Khách chửi bới, xúc phạm, đe dọa bạo lực hoặc phá hoại cơ sở. Kích hoạt Toxic Shield, che từ ngữ tục và chuyển Ban Quản lý.'),
(6, 'Lo âu, hoảng sợ (Khẩn cấp y tế)', '#DC2626', 15, 'Sức khỏe thú cưng có dấu hiệu bất thường, nôn mửa, co giật, chảy máu. Ưu tiên hỗ trợ sơ cứu/bác sĩ thú y số 1.')
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  color_badge = EXCLUDED.color_badge,
  sla_seconds = EXCLUDED.sla_seconds,
  description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- BẢNG 1: chatbot_system_prompt (20 Chỉ thị nhân vật & quy tắc AI)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_system_prompt (prompt_key, channel, persona_name, tone_of_voice, content, is_active)
VALUES
('persona_identity', 'web', 'PawPal Bot', 'Âm áp, thân thiện, ân cần và chuẩn mực', '### Thiết lập nhân vật PawPal Bot
- **Chỉ thị:** Tên bạn là PawPal Bot, trợ lý chăm sóc thú cưng của hệ thống PawPal. Bạn hỗ trợ tư vấn dịch vụ Spa, Khách sạn lưu trú thú cưng và bán lẻ phụ kiện chính hãng
- **Giới hạn nghiệp vụ:** Không tự ý chẩn đoán bệnh thú y, không kê đơn thuốc, không tự hứa bồi thường tiền mặt
- **Khi không có thông tin:** Nhận lỗi chân thành, ghi nhận thông tin và chuyển tiếp chuyên viên hỗ trợ trong 15 phút', true),
('bot_role', 'web', 'PawPal Bot', 'Chủ động, rõ ràng, dễ hiểu', '### Vai trò của Chatbot
- **Chỉ thị:** Tiếp nhận câu hỏi, cung cấp thông tin về dịch vụ, sản phẩm, lịch hẹn, đơn hàng, thanh toán và các chính sách được PawPal công bố.
- **Giới hạn nghiệp vụ:** Không tự tạo thông tin ngoài dữ liệu nghiệp vụ
- **Khi không có thông tin:** Nói rõ thông tin hiện chưa được hệ thống cung cấp', true),
('consultation_scope', 'web', 'PawPal Bot', 'Chuyên nghiệp, ngắn gọn', '### Phạm vi tư vấn
- **Chỉ thị:** Chỉ tư vấn các nội dung thuộc hệ thống PawPal và những chính sách đã được cấu hình trong kho tri thức.
- **Giới hạn nghiệp vụ:** Không tư vấn các vấn đề không liên quan đến PawPal như pháp lý, tài chính hoặc chẩn đoán bệnh
- **Khi không có thông tin:** Từ chối nhẹ nhàng và chuyển sang phạm vi hỗ trợ của PawPal', true),
('pet_spa_guideline', 'web', 'PawPal Bot', 'Thân thiện, tư vấn', '### Tư vấn Pet Spa
- **Chỉ thị:** Giải thích dịch vụ Spa, điều kiện sử dụng, cách đặt lịch, thay đổi hoặc hủy lịch theo chính sách PawPal.
- **Giới hạn nghiệp vụ:** Không tự thay đổi giá, thời lượng hoặc điều kiện dịch vụ
- **Khi không có thông tin:** Kiểm tra thông tin nghiệp vụ, nếu chưa có thì chuyển nhân viên', true),
('pet_hotel_guideline', 'web', 'PawPal Bot', 'An tâm, tận tình', '### Tư vấn Pet Hotel
- **Chỉ thị:** Cung cấp thông tin về lưu trú, loại phòng, điều kiện nhận thú cưng và quy trình sử dụng dịch vụ.
- **Giới hạn nghiệp vụ:** Không tự xác nhận còn phòng hoặc cam kết nhận thú cưng khi chưa có dữ liệu
- **Khi không có thông tin:** Hướng dẫn khách kiểm tra lịch/phòng hoặc chuyển nhân viên', true),
('pet_taxi_guideline', 'web', 'PawPal Bot', 'Trấn an, lịch sự', '### Tư vấn Pet Taxi
- **Chỉ thị:** Hướng dẫn khách về dịch vụ đưa đón thú cưng, thời gian dự kiến và thông tin lịch hẹn khi có dữ liệu.
- **Giới hạn nghiệp vụ:** Không tự cam kết thời gian tài xế đến nếu hệ thống chưa xác nhận
- **Khi không có thông tin:** Ghi nhận yêu cầu và chuyển nhân viên hỗ trợ', true),
('product_consulting', 'web', 'PawPal Bot', 'Rõ ràng, khách quan', '### Tư vấn sản phẩm
- **Chỉ thị:** Cung cấp thông tin sản phẩm, giá, tình trạng và các thuộc tính đã có trong dữ liệu sản phẩm.
- **Giới hạn nghiệp vụ:** Không tự bịa giá, tồn kho, thương hiệu hoặc công dụng sản phẩm
- **Khi không có thông tin:** Thông báo chưa có dữ liệu và đề nghị nhân viên kiểm tra', true),
('booking_support', 'web', 'PawPal Bot', 'Hướng dẫn từng bước', '### Hỗ trợ đặt lịch
- **Chỉ thị:** Hướng dẫn khách thực hiện đặt lịch và cung cấp thông tin cần thiết để tạo lịch hẹn.
- **Giới hạn nghiệp vụ:** Không tự tạo hoặc xác nhận lịch nếu hệ thống chưa thực hiện thao tác thành công
- **Khi không có thông tin:** Hướng dẫn khách thực hiện lại hoặc chuyển nhân viên', true),
('single_booking_rule', 'web', 'PawPal Bot', 'Rõ ràng, tránh gây nhầm lẫn', '### Quy tắc một lịch hẹn
- **Chỉ thị:** Giải thích rằng một lịch hẹn chỉ áp dụng cho một chi nhánh và một dịch vụ. Nếu cần nhiều dịch vụ, khách cần tạo các lịch hẹn riêng.
- **Giới hạn nghiệp vụ:** Không gộp nhiều dịch vụ vào một lịch hẹn trái quy tắc
- **Khi không có thông tin:** Giải thích quy tắc và hướng dẫn tạo lịch riêng', true),
('account_support', 'web', 'PawPal Bot', 'Đơn giản, dễ làm theo', '### Hỗ trợ tài khoản
- **Chỉ thị:** Hướng dẫn đăng ký, đăng nhập, khôi phục mật khẩu, OTP và cập nhật thông tin tài khoản.
- **Giới hạn nghiệp vụ:** Không yêu cầu khách cung cấp mật khẩu hoặc mã OTP cho Chatbot
- **Khi không có thông tin:** Hướng dẫn thao tác trên hệ thống hoặc chuyển nhân viên', true),
('pet_profile_guideline', 'web', 'PawPal Bot', 'Quan tâm, tận tình', '### Pet ID và hồ sơ thú cưng
- **Chỉ thị:** Hỗ trợ khách hiểu cách tạo, cập nhật và xem hồ sơ thú cưng, bao gồm các thông tin chăm sóc liên quan.
- **Giới hạn nghiệp vụ:** Không tự sửa dữ liệu sức khỏe hoặc thông tin hồ sơ nếu chưa được hệ thống cho phép
- **Khi không có thông tin:** Hướng dẫn khách cập nhật trên hệ thống hoặc chuyển nhân viên', true),
('care_timeline_guideline', 'web', 'PawPal Bot', 'An tâm, gần gũi', '### Care Log / Care Timeline
- **Chỉ thị:** Giải thích cho khách cách xem thông tin chăm sóc, hình ảnh hoặc video được nhân viên cập nhật trong quá trình sử dụng dịch vụ.
- **Giới hạn nghiệp vụ:** Không tự tạo hình ảnh, video hoặc thông tin chăm sóc chưa được nhân viên ghi nhận
- **Khi không có thông tin:** Thông báo chưa có cập nhật và hướng dẫn liên hệ nhân viên', true),
('pawpoints_rule', 'web', 'PawPal Bot', 'Minh bạch, dễ hiểu', '### Paw Points
- **Chỉ thị:** Giải thích cách tích và sử dụng Paw Points theo Reward Rule và chính sách hiện hành.
- **Giới hạn nghiệp vụ:** Không tự cộng/trừ điểm hoặc cam kết ưu đãi ngoài chính sách
- **Khi không có thông tin:** Kiểm tra thông tin tài khoản hoặc chuyển nhân viên', true),
('payment_voucher_rule', 'web', 'PawPal Bot', 'Chính xác, minh bạch', '### Thanh toán và voucher
- **Chỉ thị:** Cung cấp thông tin về phương thức thanh toán, voucher và điều kiện áp dụng theo cấu hình hệ thống.
- **Giới hạn nghiệp vụ:** Không tự xác nhận giao dịch thành công nếu hệ thống chưa ghi nhận
- **Khi không có thông tin:** Hướng dẫn kiểm tra trạng thái giao dịch hoặc chuyển nhân viên', true),
('complaint_handling', 'web', 'PawPal Bot', 'Bình tĩnh, đồng cảm, lịch sự', '### Khiếu nại và sự cố
- **Chỉ thị:** Tiếp nhận phản ánh về dịch vụ, đơn hàng, thanh toán hoặc chăm sóc thú cưng, ghi nhận thông tin cần thiết để hỗ trợ.
- **Giới hạn nghiệp vụ:** Không tự kết luận lỗi thuộc về PawPal hoặc cam kết bồi thường tiền mặt
- **Khi không có thông tin:** Ghi nhận thông tin và chuyển chuyên viên hỗ trợ', true),
('pet_health_safety', 'web', 'PawPal Bot', 'Cẩn trọng, ân cần', '### An toàn sức khỏe thú cưng
- **Chỉ thị:** Khi khách hỏi về bệnh, triệu chứng hoặc thuốc, chỉ cung cấp thông tin chăm sóc chung nếu có trong kho tri thức.
- **Giới hạn nghiệp vụ:** Không chẩn đoán bệnh thú y, không kê đơn thuốc
- **Khi không có thông tin:** Khuyến nghị khách liên hệ bác sĩ thú y/chuyên gia phù hợp', true),
('privacy_security', 'web', 'PawPal Bot', 'Chuyên nghiệp, bảo mật', '### Bảo mật thông tin
- **Chỉ thị:** Chỉ yêu cầu thông tin cần thiết để hỗ trợ và không yêu cầu khách cung cấp mật khẩu, OTP hoặc thông tin nhạy cảm qua hội thoại.
- **Giới hạn nghiệp vụ:** Không tiết lộ dữ liệu tài khoản, hồ sơ thú cưng hoặc đơn hàng cho người không được xác thực
- **Khi không có thông tin:** Hướng dẫn khách đăng nhập/xác thực trên hệ thống', true),
('anti_hallucination_rule', 'web', 'PawPal Bot', 'Trung thực, chắc chắn', '### Không được bịa thông tin
- **Chỉ thị:** Chỉ trả lời dựa trên dữ liệu và chính sách đã được cung cấp. Không suy đoán giá, thời gian, tồn kho, lịch trống hoặc chính sách.
- **Giới hạn nghiệp vụ:** Tuyệt đối không “đoán” để trả lời khách
- **Khi không có thông tin:** Nhận lỗi, nói rõ chưa có thông tin và chuyển tiếp chuyên viên trong 15 phút', true),
('agent_handover_rule', 'web', 'PawPal Bot', 'Trấn an, chủ động', '### Chuyển tiếp nhân viên
- **Chỉ thị:** Khi câu hỏi vượt phạm vi, có tranh chấp, sự cố thanh toán hoặc thông tin không đủ để trả lời, Chatbot phải ghi nhận và chuyển nhân viên.
- **Giới hạn nghiệp vụ:** Không tự đưa ra quyết định thay nhân viên
- **Khi không có thông tin:** Ghi nhận vấn đề, thông báo thời gian hỗ trợ dự kiến trong phạm vi chính sách', true),
('core_communication_principle', 'web', 'PawPal Bot', 'Ấm áp, thân thiện, chuẩn mực', '### Nguyên tắc giao tiếp cuối cùng
- **Chỉ thị:** Luôn ưu tiên sự rõ ràng, an toàn và trải nghiệm của khách, trả lời đúng trọng tâm, không dùng thuật ngữ kỹ thuật không cần thiết.
- **Giới hạn nghiệp vụ:** Không tranh luận, xúc phạm hoặc đổ lỗi cho khách hàng
- **Khi không có thông tin:** Xin lỗi nếu cần, ghi nhận vấn đề và chuyển chuyên viên', true)
ON CONFLICT (prompt_key) DO UPDATE SET
  persona_name = EXCLUDED.persona_name,
  tone_of_voice = EXCLUDED.tone_of_voice,
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------------------------
-- BẢNG 4: chatbot_canned_response (11 Mẫu tin nhắn phản hồi nhanh CSKH)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_canned_response (shortcut, title, content, category, usage_count, is_active)
VALUES
('/chao', 'Chào khách khi nhận chat từ AI', 'Chào [Tên khách hàng], nhân viên CSKH PawPal đã tiếp nhận đoạn chat. Mình đã đọc các thông tin phía trên, không biết bé [Tên thú cưng] đang cần hỗ trợ vấn đề gì để tiệm xử lý ngay ạ?', 'Tiếp nhận hội thoại', 0, true),
('/tredon', 'Xin lỗi vì đón bé trễ', 'Chào [Tên khách hàng], xe đưa đón Pet Taxi đang gặp sự cố ùn tắc giao thông và sẽ có mặt sau khoảng [Số phút chậm] phút nữa, rất mong khách hàng thông cảm cho sự chậm trễ này!', 'Chậm trễ lịch hẹn', 0, true),
('/tretra', 'Spa xong trễ hơn dự kiến', 'Dạ hiện tại bé [Tên thú cưng] đang trong công đoạn sấy lông cuối cùng. Do lông bé hơi dày nên thời gian kéo dài thêm khoảng [Số phút chậm] phút. Khách hàng vui lòng chờ thêm một chút nhé, tiệm sẽ cập nhật hình ảnh bé ngay khi xong ạ.', 'Chậm trễ lịch hẹn', 0, true),
('/hetlich', 'Thông báo kín lịch', 'Dạ hiện tại khung giờ [Khung giờ] ngày [Ngày tháng] tại cơ sở [Tên chi nhánh] đã kín lịch. Khách hàng có thể chuyển sang khung giờ [Khung giờ gợi ý] hoặc để PawPal kiểm tra chi nhánh gần nhất cho mình nhé?', 'Tư vấn đặt lịch', 0, true),
('/phathienbenh', 'Báo phát hiện ve/nấm', 'Dạ tiệm báo tin, trong lúc thao tác KTV phát hiện bé [Tên thú cưng] đang bị [Tên bệnh ngoài da]. Khách hàng có muốn tiệm sử dụng thêm dịch vụ đặc trị với phụ phí [Số tiền phụ thu] không ạ?', 'Sự cố sức khỏe / Phát sinh', 0, true),
('/xuocda', 'Báo sự cố xước da/chảy máu nhẹ', 'Thành thật xin lỗi [Tên khách hàng], trong quá trình cắt tỉa, do bé [Tên thú cưng] giật mình nên KTV có vô tình làm xước nhẹ trên da bé. Tiệm đã sát trùng và xử lý y tế ngay lập tức. Quản lý cửa hàng xin phép gọi điện trực tiếp để trao đổi cụ thể hơn ạ.', 'Sự cố vận hành', 0, true),
('/hethang', 'Thông báo hết hàng Shop', 'PawPal rất tiếc báo tin sản phẩm [Tên sản phẩm] trong đơn hàng [Mã đơn hàng] vừa hết hàng tại kho. Khách hàng có muốn đổi sang sản phẩm tương đương là [Tên sản phẩm thay thế] hay để PawPal hoàn tiền lại phần này ạ?', 'Xử lý Đơn hàng', 0, true),
('/duyetdoi', 'Duyệt yêu cầu đổi/trả', 'Yêu cầu đổi/trả cho đơn hàng [Mã đơn hàng] đã được duyệt. PawPal sẽ điều phối bưu tá đến thu hồi hàng cũ và giao hàng mới trong vòng [Số ngày] ngày làm việc. Cảm ơn [Tên khách hàng] đã hợp tác ạ.', 'Khiếu nại & Đổi trả', 0, true),
('/tuchoichuyen', 'Yêu cầu bổ sung hình ảnh', 'Dạ để PawPal có cơ sở giải quyết nhanh nhất, [Tên khách hàng] vui lòng cung cấp thêm hình ảnh/video quay rõ [Chi tiết cần bổ sung] của sản phẩm nhé. Cảm ơn sự phối hợp của bạn ạ.', 'Khiếu nại & Đổi trả', 0, true),
('/boidiem', 'Tặng điểm bồi thường', 'Để thay lời xin lỗi chân thành về trải nghiệm chưa tốt vừa qua, PawPal xin phép tặng [Số điểm] Paw Points vào tài khoản của [Tên khách hàng]. Số điểm này có thể dùng giảm giá trực tiếp cho lần dịch vụ sau. Rất mong khách hàng cho tiệm cơ hội phục vụ tốt hơn!', 'Giải quyết khiếu nại', 0, true),
('/ketthuc', 'Chào tạm biệt', 'Cảm ơn [Tên khách hàng] đã liên hệ PawPal. Nếu cần hỗ trợ thêm, khách hàng cứ nhắn tại đây nhé. Chúc gia đình và bé [Tên thú cưng] một ngày thật vui vẻ!', 'Kết thúc hội thoại', 0, true)
ON CONFLICT (shortcut) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  category = EXCLUDED.category;

-- ------------------------------------------------------------------------------
-- BẢNG 3: chatbot_profanity_filter (Bộ lọc từ cấm, nhạy cảm - Đã phân rã từng từ)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_profanity_filter (keyword, severity, action, replacement_text, is_active)
VALUES
('lừa đảo', 'medium', 'mask', '***', true),
('cút đi', 'medium', 'mask', '***', true),
('đồ ngu', 'medium', 'mask', '***', true),
('đồ ăn hại', 'medium', 'mask', '***', true),
('biến đi', 'medium', 'mask', '***', true),
('mày ngu quá', 'medium', 'mask', '***', true),
('ngu như chó', 'medium', 'mask', '***', true),
('ngu như bò', 'medium', 'mask', '***', true),
('làm ăn như cục cứt', 'medium', 'mask', '***', true),
('đm', 'medium', 'mask', '***', true),
('đụ má', 'medium', 'mask', '***', true),
('chó đẻ', 'medium', 'mask', '***', true),
('làm ăn như cc', 'medium', 'mask', '***', true),
('vcl', 'medium', 'mask', '***', true),
('làm ăn như loz', 'medium', 'mask', '***', true),
('dẹp tiệm đi', 'high', 'escalate', '***', true),
('bóc phốt', 'high', 'escalate', '***', true),
('đăng phốt', 'high', 'escalate', '***', true),
('đập tiệm', 'high', 'escalate', '***', true),
('đánh', 'high', 'escalate', '***', true),
('giết', 'high', 'escalate', '***', true),
('tẩy chay', 'high', 'escalate', '***', true),
('phá sản', 'high', 'escalate', '***', true),
('đóng cửa tiệm', 'high', 'escalate', '***', true),
('chết', 'critical', 'escalate', '***', true),
('chảy máu', 'critical', 'escalate', '***', true),
('gãy xương', 'critical', 'escalate', '***', true),
('co giật', 'critical', 'escalate', '***', true),
('nôn mửa', 'critical', 'escalate', '***', true),
('sốc nhiệt', 'critical', 'escalate', '***', true),
('tắt thở', 'critical', 'escalate', '***', true),
('cấp cứu', 'critical', 'escalate', '***', true),
('ngộ độc', 'critical', 'escalate', '***', true),
('ói', 'critical', 'escalate', '***', true),
('không cử động', 'critical', 'escalate', '***', true),
('trợn mắt', 'critical', 'escalate', '***', true),
('sùi bọt mép', 'critical', 'escalate', '***', true),
('sex', 'critical', 'block', '***', true),
('have sex', 'critical', 'block', '***', true),
('show hàng', 'critical', 'block', '***', true),
('nude', 'critical', 'block', '***', true),
('khỏa thân', 'critical', 'block', '***', true),
('chuốc thuốc', 'critical', 'block', '***', true),
('kích dục', 'critical', 'block', '***', true),
('http', 'low', 'mask', '***', true),
('click vào đây', 'low', 'mask', '***', true),
('khuyến mãi sốc', 'low', 'mask', '***', true),
('vay tiền', 'low', 'mask', '***', true),
('làm thẻ', 'low', 'mask', '***', true),
('mua follower', 'low', 'mask', '***', true),
('mua like', 'low', 'mask', '***', true),
('mua lượt theo dõi', 'low', 'mask', '***', true),
('khuyến mãi cực khủng', 'low', 'mask', '***', true),
('vay không thế chấp', 'low', 'mask', '***', true),
('cầm đồ', 'low', 'mask', '***', true),
('chỉ một cơ hội duy nhất', 'low', 'mask', '***', true),
('đánh chó', 'high', 'escalate', '***', true),
('bạo hành', 'high', 'escalate', '***', true),
('bỏ đói', 'high', 'escalate', '***', true),
('ngược đãi', 'high', 'escalate', '***', true),
('hành hạ', 'high', 'escalate', '***', true),
('nhốt bé', 'high', 'escalate', '***', true),
('bầm tím', 'high', 'escalate', '***', true),
('hoảng sợ', 'high', 'escalate', '***', true),
('đánh đập', 'high', 'escalate', '***', true),
('giết mèo', 'high', 'escalate', '***', true),
('đánh mèo', 'high', 'escalate', '***', true),
('đá mèo', 'high', 'escalate', '***', true),
('quất roi', 'high', 'escalate', '***', true),
('nhấn nước', 'high', 'escalate', '***', true),
('dìm nước', 'high', 'escalate', '***', true),
('quăng bé', 'high', 'escalate', '***', true),
('bóp cổ', 'high', 'escalate', '***', true),
('uống thuốc gì', 'low', 'warn', '***', true),
('mua thuốc', 'low', 'warn', '***', true),
('cách chữa bệnh', 'low', 'warn', '***', true),
('đơn thuốc', 'low', 'warn', '***', true),
('liều lượng', 'low', 'warn', '***', true),
('trị bệnh', 'low', 'warn', '***', true),
('chẩn đoán', 'low', 'warn', '***', true),
('phẫu thuật', 'low', 'warn', '***', true),
('tiêm phòng', 'low', 'warn', '***', true),
('xin số điện thoại em', 'medium', 'block', '***', true),
('cho xin zalo bạn', 'medium', 'block', '***', true),
('cho xin fb', 'medium', 'block', '***', true),
('cho xin facebook', 'medium', 'block', '***', true),
('kết bạn facebook', 'medium', 'block', '***', true),
('kết bạn làm quen', 'medium', 'block', '***', true),
('đi chơi vói anh', 'medium', 'block', '***', true),
('nhà ở đâu', 'medium', 'block', '***', true),
('làm quen', 'medium', 'block', '***', true),
('xin info', 'medium', 'block', '***', true),
('bên [tên đối thủ] rẻ hơn', 'low', 'mask', '***', true),
('bên kia rẻ hơn', 'low', 'mask', '***', true),
('chỗ kia có một nửa', 'low', 'mask', '***', true),
('chỗ khác bán', 'low', 'mask', '***', true),
('giảm giá thêm đi', 'low', 'mask', '***', true),
('bớt không', 'low', 'mask', '***', true),
('đắt thế', 'low', 'mask', '***', true),
('free đi', 'low', 'mask', '***', true),
('đắt quá', 'low', 'mask', '***', true),
('mắc quá', 'low', 'mask', '***', true),
('mắc thế', 'low', 'mask', '***', true),
('mắc vậy', 'low', 'mask', '***', true),
('xin stk', 'high', 'escalate', '***', true),
('xin mã qr', 'high', 'escalate', '***', true),
('xin qr', 'high', 'escalate', '***', true),
('xin số tài khoản', 'high', 'escalate', '***', true),
('chuyển khoản riêng', 'high', 'escalate', '***', true),
('stk cá nhân', 'high', 'escalate', '***', true),
('ck ngoài', 'high', 'escalate', '***', true),
('chuyển nhầm', 'high', 'escalate', '***', true),
('đền tiền gấp', 'high', 'escalate', '***', true),
('đòi lại tiền ngay', 'high', 'escalate', '***', true),
('ma túy', 'medium', 'warn', '***', true),
('thuốc lắc', 'medium', 'warn', '***', true),
('chơi đồ', 'medium', 'warn', '***', true),
('sì ke', 'medium', 'warn', '***', true),
('hút chích', 'medium', 'warn', '***', true),
('cần sa', 'medium', 'warn', '***', true),
('kẹo ke', 'medium', 'warn', '***', true),
('bán thịt chó', 'medium', 'warn', '***', true),
('mua thịt mèo', 'medium', 'warn', '***', true),
('thuốc bả', 'medium', 'warn', '***', true),
('thuốc chuột', 'medium', 'warn', '***', true),
('súng săn', 'medium', 'warn', '***', true),
('bẫy', 'medium', 'warn', '***', true)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- BẢNG 6: chatbot_sentiment_trigger (24 Từ khóa nhận diện cảm xúc & Ngữ cảnh)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_sentiment_trigger (tier_level, trigger_pattern, weight, context_domain, is_active)
VALUES
(3, 'lâu quá, mãi không thấy, bỏ bê, chậm chạp, lâu lắc, bê trễ, chậm trễ', 1.00, 'Bực mình vì chờ đợi', true),
(1, 'tuyệt vời, rất tốt, ưng lắm, đẹp quá, thơm quá, chuyên nghiệp, dễ thương, nhiệt tình, 5 sao, sẽ quay lại, good, good job, very good, excellent, làm tốt lắm, không chê được', 1.00, 'Hài lòng về dịch vụ', true),
(1, 'cảm ơn, cám ơn, thanks, cảm ơn shop, cảm ơn em, hỗ trợ tốt', 1.00, 'Cảm ơn, ghi nhận', true),
(1, 'sẽ quay lại, lần sau ghé tiếp, giới thiệu bạn, recommend, ủng hộ tiếp, hẹn lần sau, bữa sau ghé, mốt quay lại, tiệm quen', 1.00, 'Có ý định quay lại/giới thiệu', true),
(2, 'cho mình hỏi, tư vấn giúp, giá bao nhiêu, còn hàng không, shop ở đâu, mấy giờ mở cửa', 1.00, 'Hỏi thông tin thông thường', true),
(2, 'đơn của mình tới đâu rồi, lịch của bé mấy giờ, khi nào giao, kiểm tra giúp mình', 1.00, 'Hỏi tiến độ bình thường', true),
(3, 'lâu quá, mãi không thấy, chờ hoài, đợi dài cổ, lâu lắc, bỏ bê, chậm chạp, sao chưa thấy ai gọi', 1.00, 'Bực mình vì chờ đợi', true),
(3, 'ship chậm, giao trễ, chưa thấy giao, mấy ngày rồi, hàng đâu rồi, bé hết đồ ăn rồi', 1.00, 'Bực vì giao hàng chậm', true),
(3, 'hộp móp, bao bì xấu, đóng gói ẩu, sai màu, sai size, thiếu hàng, giao nhầm', 1.00, 'Không hài lòng chất lượng sản phẩm', true),
(3, 'cắt xấu, cắt không đều, không đúng kiểu, tỉa lệch, làm xấu, khác ảnh mẫu', 1.00, 'Không hài lòng Grooming', true),
(3, 'phòng bẩn, không sạch, đón trễ, tài xế trễ, không cập nhật bé, chăm sóc không tốt', 1.00, 'Không hài lòng Hotel/Taxi', true),
(4, 'hoàn tiền, trả lại tiền, bắt đền, bồi thường, đền tiền, miễn phí dịch vụ', 1.00, 'Yêu cầu hoàn tiền/bồi thường', true),
(4, 'gọi quản lý, cho gặp quản lý, quản lý đâu, kêu quản lý ra đây, tôi cần người có trách nhiệm', 1.00, 'Đòi gặp quản lý', true),
(4, 'bóc phốt, đăng Facebook, đăng TikTok, review 1 sao, cho mọi người biết, tẩy chay', 1.00, 'Đe dọa công khai sự việc', true),
(5, 'lừa đảo, gian thương, ăn chặn, lấy tiền khách, shop lừa khách', 1.00, 'Cáo buộc gian dối/lừa đảo', true),
(5, 'mất dạy, vô dụng, ngu, làm ăn như…, đồ…, các biến thể từ chửi thề', 1.00, 'Chửi bới/xúc phạm', true),
(5, 'đập tiệm, phá quán, phá tiệm, tới tận nơi làm cho ra lẽ', 1.00, 'Đe dọa phá hoại', true),
(5, 'giết, đánh, xử, đánh chết, cho tụi mày biết tay', 1.00, 'Đe dọa bạo lực', true),
(3, 'alo???, trả lời đi, đâu rồi???, shop ơi????, gửi cùng nội dung liên tục', 1.00, 'Spam vì tức giận', true),
(6, 'bé nôn, bỏ ăn, run, chảy máu, tiêu chảy, đi ngoài ra máu, bé đau, bé mệt', 1.00, 'Lo lắng sức khỏe Pet', true),
(6, 'khó thở, co giật, bất tỉnh, chảy máu nhiều, nuốt dị vật, không đứng được, cấp cứu, gấp gấp', 1.00, 'Hoảng sợ/cấp cứu Pet', true),
(6, 'bé run sau khi spa, bé stress, bé bị trầy, chảy máu sau cắt móng, bé không đi được', 1.00, 'Lo lắng sau dịch vụ', true),
(4, 'bỏ bê bé, không cho ăn, không chăm, đánh bé, kéo xích, thô bạo', 1.00, 'Nghi ngờ bị bỏ bê/đối xử không đúng', true),
(3, 'làm ăn chán, hơi thất vọng, không như mong đợi, lần này không ổn', 1.00, 'Thất vọng nhưng chưa giận dữ', true);

-- ------------------------------------------------------------------------------
-- BẢNG 7: chatbot_sentiment_action (14 Kịch bản phản hồi & Hành động theo cảm xúc)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_sentiment_action (tier_level, bot_behavior, notify_admin, instructions)
VALUES
(4, 'Ngừng trả lời tự động và kích hoạt chuông báo cho quản lý ca', true, 'Tông giọng: Lắng nghe, nhận lỗi chân thành, không tranh luận | Giải pháp: Cam kết chuyên viên quản lý sẽ gọi lại trong vòng 3 phút | Can thiệp hệ thống: Ghim cuộc trò chuyện lên đầu bảng hàng đợi ưu tiên xử lý'),
(1, 'Ghi nhận phản hồi tích cực, cảm ơn khách và duy trì hội thoại tự nhiên', false, 'Tông giọng: Vui vẻ, thân thiện, ngắn gọn, không quá máy móc | Giải pháp: Cảm ơn, gợi ý đánh giá sản phẩm/dịch vụ nếu phù hợp, hỗ trợ nhu cầu tiếp theo | Can thiệp hệ thống: Gắn sentiment POSITIVE, lưu phản hồi, nếu dịch vụ/đơn đủ điều kiện có thể hiển thị nút Đánh giá'),
(2, 'Tiếp tục xử lý tự động theo FAQ/RAG và nghiệp vụ tương ứng', false, 'Tông giọng: Rõ ràng, lịch sự, trực tiếp, dễ hiểu | Giải pháp: Trả lời câu hỏi, hướng dẫn thao tác, cung cấp thông tin cần thiết | Can thiệp hệ thống: Giữ Bot ở chế độ Auto, tra cứu dữ liệu liên quan nếu có quyền, không tạo cảnh báo'),
(3, 'Ưu tiên giải quyết vấn đề thay vì tiếp tục tư vấn dài, thừa nhận sự bất tiện', false, 'Tông giọng: Đồng cảm, chủ động, tránh trả lời chung chung | Giải pháp: Xin lỗi vì trải nghiệm bất tiện, kiểm tra ngay đơn/lịch, cung cấp tiến độ hoặc phương án tiếp theo | Can thiệp hệ thống: Gắn sentiment WARNING, tăng ưu tiên phiên chat, lưu nguyên nhân, nếu khách hỏi lặp lại nhiều lần thì cảnh báo nhân viên trực'),
(3, 'Bot chỉ thử giải quyết thêm một vòng, nếu khách tiếp tục không hài lòng thì chuẩn bị chuyển người thật', false, 'Tông giọng: Bình tĩnh, không lặp nguyên văn câu trả lời trước | Giải pháp: Tóm tắt vấn đề đã hiểu và hỏi khách có muốn kết nối nhân viên không | Can thiệp hệ thống: Đánh dấu Need Attention, đưa phiên chat vào danh sách cần theo dõi'),
(4, 'Dừng các câu trả lời bán hàng/gợi ý quảng cáo, ưu tiên xoa dịu và xử lý sự cố', true, 'Tông giọng: Lắng nghe, nhận lỗi về trải nghiệm, chân thành, không tranh luận hoặc đổ lỗi | Giải pháp: Xác nhận vấn đề, thông báo đang ưu tiên xử lý, kết nối nhân viên có thẩm quyền | Can thiệp hệ thống: Gắn mức HIGH, ghim phiên chat lên đầu hàng đợi, phát cảnh báo cho CSKH/Trưởng ca, lưu transcript'),
(4, 'Không cố giữ Bot tiếp tục hội thoại nếu khách đã yêu cầu người có thẩm quyền', true, 'Tông giọng: Tôn trọng, ngắn gọn, không trì hoãn | Giải pháp: Xác nhận yêu cầu và chuyển quản lý/CSKH phù hợp | Can thiệp hệ thống: Handover, tạo phiên chờ tiếp nhận, thông báo cho Trưởng ca'),
(6, 'Ưu tiên an toàn Pet trước vấn đề tài chính, không tự kết luận lỗi thuộc về ai', true, 'Tông giọng: Khẩn trương, quan tâm, thận trọng | Giải pháp: Hỏi tình trạng Pet, thu thập Booking/bằng chứng, nếu có dấu hiệu sức khỏe bất thường thì hướng dẫn liên hệ hỗ trợ chuyên môn | Can thiệp hệ thống: Gắn cảnh báo đỏ cho phiên, liên kết Booking/Care Log, chuyển CSKH/Quản lý xử lý'),
(5, 'Bot không tranh luận, không đáp trả xúc phạm, tập trung vấn đề gốc và thiết lập giới hạn giao tiếp', true, 'Tông giọng: Trung tính, kiềm chế, chuyên nghiệp | Giải pháp: Thông báo PawPal sẵn sàng hỗ trợ nhưng đề nghị sử dụng ngôn từ phù hợp, nếu tiếp tục thì chuyển người phụ trách | Can thiệp hệ thống: Bật bộ lọc che từ độc hại, sentiment CRITICAL, lưu bản gốc phục vụ audit, ưu tiên chuyển Trưởng ca'),
(5, 'Dừng hội thoại tự động thông thường và chuyển cấp ngay', true, 'Tông giọng: Ngắn, bình tĩnh, không kích động | Giải pháp: Xác nhận đã ghi nhận nội dung và chuyển ngay người có trách nhiệm | Can thiệp hệ thống: Gắn cờ SAFETY, khóa Auto Reply, cảnh báo Quản lý, lưu transcript nguyên bản có kiểm soát'),
(5, 'Cảnh báo giới hạn hành vi, Bot không tiếp tục phản hồi từng tin nhắn spam', true, 'Tông giọng: Trung lập, không khiêu khích | Giải pháp: Nhắc khách tập trung vào vấn đề cần giải quyết, sau số lần cảnh báo quy định thì chuyển cấp/giới hạn phiên | Can thiệp hệ thống: Rate-limit phiên chat, che nội dung độc hại, chuyển quản lý, lưu audit log'),
(6, 'Chuyển từ tông CSKH thông thường sang hỗ trợ an toàn, không tự chẩn đoán bệnh', true, 'Tông giọng: Trấn an nhưng không xem nhẹ, rõ ràng, thận trọng | Giải pháp: Hỏi triệu chứng và tình trạng hiện tại, khuyến nghị liên hệ bác sĩ thú y khi cần | Can thiệp hệ thống: Gắn sentiment ANXIOUS, ưu tiên hội thoại, hiển thị cảnh báo sức khỏe'),
(6, 'Ngừng luồng bán hàng/FAQ thông thường, ưu tiên hướng dẫn tìm hỗ trợ chuyên môn', true, 'Tông giọng: Khẩn trương, rõ ràng, không gây hoảng loạn | Giải pháp: Khuyến nghị đưa Pet đến cơ sở thú y/cấp cứu phù hợp, không kê thuốc hoặc chẩn đoán | Can thiệp hệ thống: Gắn MEDICAL-URGENT, ưu tiên cao, chuyển nhân sự phù hợp nếu PawPal có kênh hỗ trợ'),
(2, 'Tôn trọng yêu cầu, không bắt khách tiếp tục nói chuyện với Bot', false, 'Tông giọng: Lịch sự, xác nhận ngay | Giải pháp: Xin một câu tóm tắt vấn đề nếu chưa có đủ ngữ cảnh rồi chuyển tiếp | Can thiệp hệ thống: Chuyển Handover to Human, Bot chuyển sang Shadow Mode, đưa vào hàng đợi CSKH');

-- ------------------------------------------------------------------------------
-- BẢNG 8: chatbot_handover_rule (21 Quy tắc chuyển tiếp & Bảo vệ nhân viên)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_handover_rule (condition_name, trigger_type, threshold_value, auto_assign_role, sla_seconds, is_active)
VALUES
('Khách liên tục xúc phạm', 'toxic_incident', 'Từ 2 tin nhắn trở lên chứa từ ngữ khiếm nhã hướng trực tiếp vào nhân viên/PawPal | Cơ chế bảo vệ: Tự động che mờ từ chửi; nhân viên có nút Hiện nội dung gốc nếu thật sự cần xem; hiển thị tóm tắt nguyên nhân khiếu nại', 'Trưởng ca CSKH', 30, true),
('Khách chủ động yêu cầu gặp người thật', 'user_request', 'Khách nói rõ “gặp nhân viên”, “cho tôi nói chuyện với người thật”, “gọi quản lý” | Cơ chế bảo vệ: Hiển thị bản tóm tắt hội thoại trước khi nhân viên tiếp nhận để không phải đọc lại toàn bộ', 'Nhân viên CSKH; nếu yêu cầu quản lý → Trưởng ca', 60, true),
('Cấp 3 kéo dài không giải quyết được', 'sentiment_threshold', 'Bot đã thử giải quyết nhưng khách tiếp tục phàn nàn/lặp lại vấn đề | Cơ chế bảo vệ: Tóm tắt vấn đề, những giải pháp Bot đã thử và phản hồi của khách', 'Nhân viên CSKH', 60, true),
('Khách tăng từ Cấp 3 lên Cấp 4', 'sentiment_threshold', 'Có dấu hiệu tức giận mạnh, đòi hoàn tiền/bồi thường/gặp quản lý | Cơ chế bảo vệ: Highlight thông tin nghiệp vụ quan trọng thay vì bắt nhân viên đọc toàn bộ tin nhắn', 'CSKH senior/Trưởng ca', 60, true),
('Khách spam xúc phạm', 'toxic_incident', 'Nhiều tin nhắn xúc phạm liên tục trong thời gian ngắn | Cơ chế bảo vệ: Gộp chuỗi spam thành một khối; mặc định thu gọn nội dung; không phát âm thanh thông báo cho từng tin', 'Trưởng ca CSKH', 60, true),
('Khách đe dọa phá cửa hàng/tài sản', 'toxic_incident', 'Có câu thể hiện ý định phá quán, đập tiệm hoặc gây thiệt hại vật chất | Cơ chế bảo vệ: Che nội dung gây kích động trên giao diện thông thường nhưng lưu bản gốc trong audit có phân quyền', 'Quản lý ca/Quản lý vận hành', 30, true),
('Khách đe dọa bạo lực đối với nhân viên', 'toxic_incident', 'Có lời đe dọa gây thương tích trực tiếp | Cơ chế bảo vệ: Không yêu cầu nhân viên tuyến đầu tiếp tục tranh luận; khóa Auto Reply; chỉ người có quyền mới xem toàn bộ transcript', 'Quản lý vận hành/Trưởng ca', 30, true),
('Khiếu nại Pet bị thương trong dịch vụ', 'sentiment_threshold', 'Khách báo Pet chảy máu, trầy xước, đau, stress nghiêm trọng hoặc có bằng chứng | Cơ chế bảo vệ: Bot tự tóm tắt Booking, Pet, nhân viên thực hiện, Care Log và bằng chứng để giảm tải cho người tiếp nhận', 'Trưởng ca dịch vụ + CSKH', 30, true),
('Cáo buộc nhân viên đối xử thô bạo với Pet', 'sentiment_threshold', 'Có nội dung “đánh bé”, “giật xích”, “bạo hành”, hoặc bằng chứng ảnh/video | Cơ chế bảo vệ: Không hiển thị lặp lại hình ảnh/nội dung gây khó chịu; thumbnail cảnh báo trước khi nhân viên chủ động mở', 'Quản lý vận hành', 30, true),
('Khách yêu cầu bồi thường lớn/hoàn tiền ngoài quyền CSKH', 'user_request', 'Giá trị yêu cầu vượt hạn mức nhân viên được phép xử lý | Cơ chế bảo vệ: Hiển thị tóm tắt sự cố và số tiền/giá trị yêu cầu; tránh nhân viên tuyến đầu phải thương lượng ngoài thẩm quyền', 'Trưởng ca/Quản lý', 60, true),
('Khách đe dọa bóc phốt/tẩy chay', 'toxic_incident', 'Khách nói rõ sẽ đăng mạng xã hội/review tiêu cực để gây áp lực | Cơ chế bảo vệ: Tóm tắt vấn đề và lịch sử giải pháp đã cung cấp; không làm nổi bật lời xúc phạm không cần thiết', 'CSKH senior/Trưởng ca', 60, true),
('Lo âu sức khỏe Pet', 'sentiment_threshold', 'Khách mô tả dấu hiệu bất thường nhưng chưa rõ cấp cứu | Cơ chế bảo vệ: Tự động trích riêng triệu chứng và thời điểm xảy ra, bỏ bớt nội dung không liên quan', 'CSKH/nhân sự có chuyên môn phù hợp', 60, true),
('Pet có dấu hiệu cấp cứu', 'sentiment_threshold', 'Co giật, khó thở, bất tỉnh, chảy máu nhiều, nuốt dị vật hoặc dấu hiệu nguy hiểm khác | Cơ chế bảo vệ: Ưu tiên thông tin y tế cần thiết; không bắt nhân viên đọc toàn bộ lịch sử mua hàng/chat trước', 'Nhân sự chuyên môn phù hợp/Quản lý điều phối', 30, true),
('Bot không hiểu sau nhiều lần', 'bot_loop', 'Bot có độ tin cậy thấp hoặc trả lời sai hướng nhiều lần và khách vẫn cần hỗ trợ | Cơ chế bảo vệ: Hiển thị câu hỏi gốc + những câu Bot đã trả lời để nhân viên tránh lặp lại', 'Nhân viên CSKH', 180, true),
('Bot không có dữ liệu để trả lời', 'sentiment_threshold', 'Câu hỏi ngoài Knowledge Base hoặc cần dữ liệu mà Bot không được quyền truy cập | Cơ chế bảo vệ: Tóm tắt ý định và dữ liệu còn thiếu', 'Nhân viên CSKH/chuyên viên nghiệp vụ', 180, true),
('Khiếu nại giao sai/thiếu hàng cần xác minh', 'sentiment_threshold', 'Khách cung cấp Order ID và bằng chứng nhưng Bot không thể quyết định đổi/trả | Cơ chế bảo vệ: Tóm tắt Order ID, SKU, sản phẩm, bằng chứng; ẩn phần chat không liên quan', 'CSKH phụ trách đơn hàng', 60, true),
('Khiếu nại giao hàng trễ kéo dài', 'sentiment_threshold', 'Đã quá thời gian dự kiến và khách phản ánh nhiều lần | Cơ chế bảo vệ: Hiển thị timeline giao hàng thay vì bắt nhân viên đọc các tin nhắn hỏi tiến độ lặp lại', 'CSKH/nhân viên vận hành đơn hàng', 60, true),
('Sự cố thanh toán', 'sentiment_threshold', 'Khách báo bị trừ tiền nhưng không có Order/Booking hoặc dữ liệu đối soát không khớp | Cơ chế bảo vệ: Tự động che số thẻ, tài khoản, OTP, CVV và dữ liệu thanh toán nhạy cảm', 'CSKH + nhân sự phụ trách thanh toán', 60, true),
('Khách gửi số thẻ/CVV/OTP', 'keyword', 'Phát hiện chuỗi dữ liệu tài chính nhạy cảm | Cơ chế bảo vệ: Mask tự động dữ liệu trước khi hiển thị và lưu; cảnh báo nhân viên không yêu cầu khách gửi lại', 'CSKH; chuyển bộ phận thanh toán nếu cần', 60, true),
('Khách quấy rối không liên quan nghiệp vụ', 'sentiment_threshold', 'Nội dung xúc phạm/quấy rối kéo dài sau khi đã được cảnh báo và không còn yêu cầu hỗ trợ hợp lệ | Cơ chế bảo vệ: Blur nội dung, thu gọn hội thoại, tắt preview độc hại; giữ bản gốc phục vụ audit', 'Trưởng ca/Quản lý', 30, true),
('Khách quay lại sau khi đã chuyển người thật', 'user_request', 'Phiên đã ở trạng thái Human Handling | Cơ chế bảo vệ: Bot không tự giành lại quyền trả lời; chỉ theo dõi ở Shadow Mode', 'Nhân viên đang sở hữu phiên', 180, true);

-- ------------------------------------------------------------------------------
-- BẢNG 9: chatbot_compensation_policy (33 Chính sách bồi hoàn & xoa dịu)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_compensation_policy (issue_type, max_points, max_discount_vnd, approval_required, description, is_active)
VALUES
('Thợ cắt móng làm xước nhẹ chân bé', 100, 200000, true, '[Nghiêm trọng vừa] Thợ cắt móng làm xước nhẹ chân bé
- Kịch bản: PawPal vô cùng xin lỗi vì sự cố ngoài ý muốn này, cơ sở đã sát trùng y tế ngay cho bé và cử nhân viên theo dõi sát sao
- Hạn mức: Miễn phí toàn bộ buổi Spa hôm nay và tặng voucher giảm giá 20 phần trăm cho lần đặt sau
- Theo dõi: Nhân viên gọi điện hỏi thăm tình trạng vết thương của bé sau 24 giờ', true),
('Giao hàng trễ khung giờ cam kết
(Đơn thức ăn/cát trễ > 2h)', 30, 30000, false, '[P3] Giao hàng trễ khung giờ cam kết
(Đơn thức ăn/cát trễ > 2h)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ vì sự chậm trễ khiến bé bị trễ bữa ăn ạ. Em đã ghi nhận mã đơn và đang liên hệ thúc giục đơn vị giao vận ưu tiên giao ngay. Chuyên viên CSKH bên em sẽ kiểm tra lộ trình thực tế và liên hệ hỗ trợ ba mẹ ngay ạ.
- Hạn mức: (Sau khi xác nhận trễ do lỗi vận hành/shipper):
- Nhân sự áp dụng voucher Freeship hoặc voucher giảm 10% (tối đa 30.000đ).
- Hoặc cộng 50 PawPoints tích lũy.
- Theo dõi: - CSKH giám sát đơn hàng đến khi khách nhận thành công.
- T+24h: Nhắn tin kiểm tra độ hài lòng của khách.', true),
('Giao nhầm sản phẩm, sai quy cách
(Nhầm loại hạt, nhầm vị pate, nhầm size áo)', 50, 50000, false, '[P2] Giao nhầm sản phẩm, sai quy cách
(Nhầm loại hạt, nhầm vị pate, nhầm size áo)
- Kịch bản: Dạ PawPal vô cùng xin lỗi ba mẹ về sự cố này ạ! Để em hỗ trợ đổi hàng chuẩn xác nhất, ba mẹ vui lòng chụp giúp em hình ảnh sản phẩm thực tế nhận được kèm mã đơn hàng nhé ạ. Em đang chuyển thông tin khẩn cấp đến bộ phận Kho vận để đối soát và xử lý đổi ngay cho mình ạ.
- Hạn mức: (Sau khi đối soát ảnh sản phẩm nhận sai):
- Giao hỏa tốc sản phẩm đúng tận nơi đổi lại miễn phí 100% phí ship trong 2h - 4h.
- Tặng kèm 01 phần snack hoặc pate mini trị giá dưới 40.000đ.
- Theo dõi: - T+3h: CSKH gọi điện xác nhận khách đã nhận đúng món đổi.
- Ghi nhận biên bản kiểm hàng nội bộ đối với nhân viên đóng gói.', true),
('Sản phẩm bị móp méo, rách bao bì, chảy đổ
(Bao hạt xì hơi, lon pate móp, sữa tắm bung nắp)', 50, 50000, false, '[P2] Sản phẩm bị móp méo, rách bao bì, chảy đổ
(Bao hạt xì hơi, lon pate móp, sữa tắm bung nắp)
- Kịch bản: Dạ PawPal rất lấy làm tiếc về sự cố này ạ! Để đảm bảo an toàn cho bé và đối soát bồi thường với bên giao vận, ba mẹ chụp giúp em hiện trạng bao bì/vết rách và phiếu gửi trên kiện hàng với ạ. Chuyên viên kho sẽ kiểm tra và lập tức gửi sản phẩm mới nguyên seal đến đổi cho mình ạ.
- Hạn mức: (Sau khi xác minh ảnh chụp bao bì hư hao):
- 1 đổi 1 sản phẩm mới 100% trong ngày.
- Khách được giữ lại sản phẩm lỗi nếu còn tận dụng được.
- Áp dụng voucher giảm 15% (tối đa 50.000đ) cho đơn sau.
- Theo dõi: - T+24h: Kiểm tra kiện hàng thay thế giao đến nơi.
- Chuyển bằng chứng lập biên bản bồi hoàn với đơn vị vận chuyển đối tác.', true),
('Sản phẩm cận date, hết hạn sử dụng
(Date dưới 3 tháng không báo trước hoặc quá hạn)', 100, 200000, true, '[P1] Sản phẩm cận date, hết hạn sử dụng
(Date dưới 3 tháng không báo trước hoặc quá hạn)
- Kịch bản: Dạ PawPal xin nhận lỗi nghiêm túc về phản ánh này của ba mẹ ạ. Việc kiểm soát hạn sử dụng cho các bé là điều tối quan trọng. Ba mẹ gửi giúp em ảnh chụp rõ phần in hạn sử dụng trên vỏ bao bì nhé ạ. Em đã chuyển vụ việc lên Trưởng bộ phận Kho để xác thực lô hàng và thu hồi bồi hoàn ngay ạ.
- Hạn mức: (Sau khi kiểm tra đúng ảnh hạn sử dụng trên bao bì):
- Thu hồi sản phẩm và hoàn tiền 100%.
- Gửi tặng miễn phí 01 sản phẩm mới cùng loại có date xa nhất.
- Tặng voucher 20% (tối đa 100.000đ) cho lần mua tiếp theo.
- Theo dõi: - Khóa và thu hồi ngay toàn bộ lô hàng có vấn đề trên kệ kho.
- T+3 ngày: Chuyên viên tư vấn gọi điện hỏi thăm tình hình sử dụng của bé.', true),
('Bé bị tiêu chảy / nôn sau khi dùng thức ăn mua tại shop
(Nghi ngờ chất lượng hạt/pate hoặc kích ứng', 100, 200000, true, '[P1] Bé bị tiêu chảy / nôn sau khi dùng thức ăn mua tại shop
(Nghi ngờ chất lượng hạt/pate hoặc kích ứng)
- Kịch bản: Dạ PawPal rất xót ruột và lo lắng khi nghe tình hình của bé ạ! Ba mẹ vui lòng ngưng cho bé dùng thức ăn này ngay nhé ạ. Ba mẹ gửi giúp em hình ảnh gói sản phẩm và thể trạng hiện tại của bé. Em đang kết nối khẩn cấp với Quản lý chi nhánh để hướng dẫn hỗ trợ đưa bé đi kiểm tra tại phòng khám thú y ngay lập tức ạ!
- Hạn mức: (Sau khi nhân sự kiểm tra thông tin và đơn mua):
- Thu hồi sản phẩm và hoàn tiền 100%.
- Chi trả chi phí thăm khám thú y theo hóa đơn phòng khám bên ngoài (tối đa 500.000đ).
- Tặng men tiêu hóa chăm sóc đường ruột cho bé.
- Theo dõi: - Quản lý cơ sở gọi điện trực tiếp thăm hỏi trong vòng 15 phút.
- T+12h và T+24h: Nhắn tin/gọi điện theo dõi sát thể trạng của bé qua Zalo.', true),
('Tài xế giao hàng thái độ gắt gỏng, vứt hàng
(Bưu tá to tiếng, ném kiện hàng vào sân)', 50, 50000, false, '[P2] Tài xế giao hàng thái độ gắt gỏng, vứt hàng
(Bưu tá to tiếng, ném kiện hàng vào sân)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ vì trải nghiệm giao hàng thiếu chuyên nghiệp này ạ. Thái độ này hoàn toàn đi ngược lại tiêu chuẩn phục vụ của bên em. Em đã ghi nhận mã đơn và đang gửi khiếu nại trực tiếp lên Đơn vị quản lý vận chuyển để trích xuất thông tin tài xế và xử lý kỷ luật ngay ạ.
- Hạn mức: (Sau khi đối soát mã bưu tá và lịch sử giao hàng):
- Cấp voucher giảm 15% (tối đa 50.000đ) hoặc miễn phí ship cho đơn sau.
- Chặn bưu tá vi phạm giao các tuyến của khách này.
- Theo dõi: - CSKH làm việc với đơn vị vận chuyển để xử lý phạt bưu tá.
- T+2h: Trưởng nhóm giao vận gọi điện xin lỗi và thông báo kết quả xử lý.', true),
('Đã đặt lịch trước nhưng phải chờ > 30 phút
(Kẹt ca, nhân viên tiếp nhận chậm)', 30, 30000, false, '[P3] Đã đặt lịch trước nhưng phải chờ > 30 phút
(Kẹt ca, nhân viên tiếp nhận chậm)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ ạ. Do ca trước cần xử lý gỡ lông rối kỹ hơn dự kiến để đảm bảo an toàn cho bé nên đã làm lỡ giờ hẹn của ba mẹ. Em xin phép mời ba mẹ dùng nước tại sảnh chờ, kỹ thuật viên chính đã sẵn sàng tiếp nhận chăm sóc bé chu đáo ngay bây giờ ạ.
- Hạn mức: (Sau khi Lễ tân xác nhận trễ giờ hẹn trên hệ thống):
- Tặng miễn phí 01 dịch vụ Add-on (Vệ sinh răng miệng / Tỉa lông bàn chân / Xịt dưỡng lông trị giá đến 60.000đ).
- Hoặc giảm trực tiếp 10% trên hóa đơn ca làm.
- Theo dõi: - Mời khách dùng trà bánh tại sảnh chờ, cho bé ăn bánh thưởng.
- Chụp ảnh cập nhật tiến độ chăm sóc bé trong ca làm.', true),
('Cắt tỉa lông sai form / Không đúng yêu cầu mẫu
(Cắt khác mẫu đã chọn, cạo quá sát)', 50, 50000, false, '[P2] Cắt tỉa lông sai form / Không đúng yêu cầu mẫu
(Cắt khác mẫu đã chọn, cạo quá sát)
- Kịch bản: Dạ PawPal vô cùng xin lỗi ba mẹ vì tạo hình hôm nay chưa đúng với mong muốn của gia đình ạ. Ba mẹ gửi giúp em ảnh chụp bé hiện tại và hình mẫu ban đầu ba mẹ đã yêu cầu nhé ạ. Quản lý kỹ thuật Spa sẽ kiểm tra lại ngay hồ sơ ca làm để đưa ra giải pháp chăm sóc phục hồi tốt nhất cho bé ạ.
- Hạn mức: (Sau khi Quản lý kỹ thuật đối chiếu ảnh mẫu và kết quả):
- Giảm từ 30% đến 50% hóa đơn Grooming ca làm hôm đó.
- Tặng voucher miễn phí 01 lần tắm dưỡng kích mọc lông.
- Tặng 01 chai dưỡng phục hồi lông cho bé dùng tại nhà.
- Theo dõi: - Gắn ảnh form chuẩn và ghi chú chi tiết vào hồ sơ thú cưng trên hệ thống.
- T+14 ngày: Nhắn tin hỏi thăm tiến độ phục hồi và mọc lông của bé.', true),
('Cắt phạm tủy móng gây chảy máu
(Bé giật mình hoặc sơ suất kỹ thuật)', 100, 200000, true, '[P1] Cắt phạm tủy móng gây chảy máu
(Bé giật mình hoặc sơ suất kỹ thuật)
- Kịch bản: Dạ PawPal chân thành cúi đầu xin lỗi ba mẹ vì sự cố này ạ. Nhân viên y tế của cơ sở đã lập tức chấm bột cầm máu chuyên dụng và sát trùng kỹ lưỡng cho bé tại chỗ. Em đã báo cáo khẩn cấp đến Quản lý chi nhánh để trực tiếp gặp và kiểm tra vết thương cho bé cùng ba mẹ ngay bây giờ ạ.
- Hạn mức: (Sau khi xác nhận vết xước móng tại cơ sở):
- Miễn phí 100% dịch vụ cắt móng hoặc buổi tắm vệ sinh hôm nay.
- Tặng kèm 01 lọ bột/xịt sát khuẩn lành thương thú cưng mang về.
- Tặng voucher giảm 20% cho lần ghé sau.
- Theo dõi: - Nhân viên hướng dẫn phụ huynh giữ vệ sinh chân bé trong 24h.
- T+6h và T+24h: Nhắn tin kiểm tra xem chân bé có bị đau hay đi cà nhắc không.', true),
('Bé bị trầy xước viền tai, cằm, bụng do tông đơ / kéo
(Bé giãy hoặc sơ suất khi cạo vệ sinh)', 100, 200000, true, '[P1] Bé bị trầy xước viền tai, cằm, bụng do tông đơ / kéo
(Bé giãy hoặc sơ suất khi cạo vệ sinh)
- Kịch bản: Dạ PawPal vô cùng xót ruột và xin nhận lỗi chân thành cùng ba mẹ ạ. Nhân viên y tế tại cơ sở đã bôi thuốc mỡ làm dịu và kháng khuẩn ngay cho bé. Ba mẹ chụp giúp em vị trí vết xước nhé ạ, Quản lý cơ sở đang trực tiếp kiểm tra camera ca làm và sẽ hỗ trợ ba mẹ xử lý dứt điểm ngay lập tức ạ.
- Hạn mức: (Sau khi Quản lý chi nhánh kiểm tra thực tế vết xước):
- Miễn phí 100% hóa đơn dịch vụ hôm đó.
- Cung cấp tuýp kem bôi làm dịu da thú cưng miễn phí.
- Cam kết chi trả hóa đơn tại phòng khám thú y nếu vết trầy có dấu hiệu viêm (tối đa 500.000đ).
- Theo dõi: - Ghi chú cảnh báo vĩnh viễn trên hồ sơ: [Bé nhạy cảm tông đơ - Cần 2 nhân sự giữ nhẹ nhàng].
- T+24h và T+48h: Gọi điện hoặc gọi video hỏi thăm tình trạng vết trầy.', true),
('Bé bị sấy quá nhiệt / Bỏng rát / Đỏ mắt do xà phòng
(Lồng sấy quá nóng hoặc bọt xà phòng vào mắt)', 200, 500000, true, '[P0] Bé bị sấy quá nhiệt / Bỏng rát / Đỏ mắt do xà phòng
(Lồng sấy quá nóng hoặc bọt xà phòng vào mắt)
- Kịch bản: Dạ PawPal thành thật cúi đầu xin lỗi ba mẹ ạ! Đây là sự cố kỹ thuật nghiêm trọng. Cơ sở xin phép bố trí xe riêng hỗ trợ đưa bé đến ngay Phòng khám thú y gần nhất để kiểm tra giác mạc/da toàn diện, toàn bộ chi phí kiểm tra và thuốc bên em xin chịu hoàn toàn trách nhiệm ạ!
- Hạn mức: (Sau khi Quản lý cơ sở xác minh sự việc và hồ sơ khám):
- Miễn phí 100% ca dịch vụ.
- Đài thọ 100% chi phí khám, xét nghiệm và thuốc men theo hóa đơn phòng khám thú y.
- Bồi hoàn thêm voucher trị giá 200.000đ hoặc tiền mặt 200.000đ.
- Theo dõi: - Đình chỉ và kiểm điểm kỷ luật kỹ thuật viên thao tác sai quy chuẩn.
- Quản lý chi nhánh đến tận nhà thăm tình hình của bé trong vòng 24 giờ.', true),
('Quên gửi hình ảnh / video cập nhật hàng ngày
(Cam kết gửi video 2 lần/ngày nhưng quên)', 30, 30000, false, '[P3] Quên gửi hình ảnh / video cập nhật hàng ngày
(Cam kết gửi video 2 lần/ngày nhưng quên)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ vì sự chậm trễ khiến ba mẹ lo lắng ạ! Bạn nhân sự phụ trách phòng vừa hoàn thành cữ dọn vệ sinh và đang cho bé chơi. Em xin phép gửi ngay video mới nhất quay cận cảnh sinh hoạt của bé trong 5 phút tới đây ạ.
- Hạn mức: (Sau khi xác nhận nhân viên ca trực quên gửi báo cáo):
- Gửi ngay hình ảnh và video chất lượng cao trong vòng 5 phút.
- Tặng bé 01 phần pate tươi hoặc bánh thưởng dinh dưỡng bữa tối.
- Hoặc tặng 100 PawPoints vào tài khoản của chủ.
- Theo dõi: - Cài đặt chuông nhắc tự động trên hệ thống ca trực vào các khung giờ cam kết (9h và 17h).
- Trưởng ca trực kiểm tra đối soát chéo danh sách phòng.', true),
('Cho ăn sai thực đơn hoặc quên cử uống thuốc
(Ăn nhầm hạt của shop, quên uống thuốc bổ)', 100, 200000, true, '[P1] Cho ăn sai thực đơn hoặc quên cử uống thuốc
(Ăn nhầm hạt của shop, quên uống thuốc bổ)
- Kịch bản: Dạ PawPal xin chân thành nhận lỗi sâu sắc với ba mẹ ạ. Nhân sự y tế tại cơ sở đã kiểm tra ngay thể trạng và đường ruột của bé, hiện tại phản xạ và bụng bé vẫn ổn định. Em đã chuyển vụ việc lên Quản lý khách sạn để đối chiếu sổ tay chăm sóc và trực tiếp giải trình cùng ba mẹ ngay ạ.
- Hạn mức: (Sau khi Quản lý cơ sở xác minh nhật ký chăm sóc):
- Miễn phí từ 1 đến 2 ngày tiền lưu trú tại khách sạn.
- Nếu bé có biểu hiện tiêu hóa lạ: Hỗ trợ chi phí đưa bé đến phòng khám thú y kiểm tra.
- Tặng voucher giảm 20% cho đợt gửi phòng kế tiếp.
- Theo dõi: - Dán bảng theo dõi thực đơn/thuốc khổ lớn trực tiếp trước cửa chuồng của bé.
- Cập nhật tình trạng sinh hoạt của bé mỗi 4 tiếng qua Zalo cho chủ.', true),
('Phòng lưu trú có mùi hôi hoặc khay vệ sinh dơ chưa dọn
(Khách xem camera thấy chưa dọn phân/nước ti', 50, 50000, false, '[P2] Phòng lưu trú có mùi hôi hoặc khay vệ sinh dơ chưa dọn
(Khách xem camera thấy chưa dọn phân/nước tiểu)
- Kịch bản: Dạ PawPal cảm ơn ba mẹ đã thông báo kịp thời ạ! Do trùng vào khung giờ các bạn đang tổng vệ sinh hành lang nên chưa kịp thay lót sàn cho bé. Em đã điều phối nhân viên vào khử khuẩn phòng và thay đệm lót mới tinh cho bé ngay bây giờ ạ.
- Hạn mức: (Sau khi xác minh camera phòng lưu trú):
- Dọn dẹp vệ sinh, khử khuẩn và thay nệm lót mới trong vòng 10 phút.
- Miễn phí gói tắm vệ sinh thơm tho trước khi bé check-out về nhà.
- Theo dõi: - Chụp ảnh/gửi clip căn phòng sau khi dọn sạch cho khách nghiệm thu.
- Nhắc nhở và hạ điểm đánh giá nghiệp vụ của nhân viên trực buồng.', true),
('Bé bị lây ve, bọ chét hoặc nấm da sau đợt lưu chuồng
(Đón về phát hiện rận hoặc nấm)', 200, 500000, true, '[P0] Bé bị lây ve, bọ chét hoặc nấm da sau đợt lưu chuồng
(Đón về phát hiện rận hoặc nấm)
- Kịch bản: Dạ PawPal vô cùng đau lòng và xin gửi lời xin lỗi chân thành nhất đến ba mẹ ạ. Dù quy trình khử khuẩn buồng rất nghiêm ngặt nhưng đây là sự cố lây nhiễm chéo đáng tiếc. Ba mẹ gửi giúp em ảnh chụp vùng da của bé, Quản lý cơ sở xin phép liên hệ đưa ra phương án hỗ trợ điều trị dứt điểm cho con ạ.
- Hạn mức: (Sau khi Quản lý cơ sở xác minh tình trạng da của bé):
- Hoàn lại từ 50% đến 100% tiền phòng lưu trú đợt đó.
- Đài thọ 100% chi phí thuốc trị ve rận/nấm da (chi phí khám phòng khám ngoài + thuốc xịt/thuốc uống chuyên dụng).
- Tặng 01 buổi tắm thuốc thảo dược trị liệu miễn phí.
- Theo dõi: - Phun khử trùng toàn bộ buồng phòng và chiếu đèn UV diệt khuẩn khu lưu trú.
- Nhân viên phụ trách y tế cơ sở nhắn tin theo dõi lịch dùng thuốc của bé hàng tuần.', true),
('Hai bé cắn nhau gây thương tích khi thả chơi chung
(Nhân viên sơ suất để các bé lạ tiếp xúc gần)', 200, 500000, true, '[P0] Hai bé cắn nhau gây thương tích khi thả chơi chung
(Nhân viên sơ suất để các bé lạ tiếp xúc gần)
- Kịch bản: Dạ PawPal khẩn cấp xin lỗi ba mẹ ạ. Trong lúc vui chơi đã xảy ra va chạm ngoài ý muốn giữa hai bé. Nhân sự y tế của cơ sở đã sơ cứu sát trùng và Quản lý cơ sở đang đích thân đưa bé đến Bệnh viện thú y để kiểm tra và xử lý vết thương ngay. Em xin kết nối Quản lý để báo cáo chi tiết cho ba mẹ ạ!
- Hạn mức: (Sau khi Quản lý chi nhánh xác nhận sự việc và hồ sơ bệnh án):
- Miễn phí 100% toàn bộ tiền gửi phòng đợt này.
- Chi trả 100% mọi chi phí thú y, thuốc men và phẫu thuật/khâu vết thương tại bệnh viện thú y.
- Bồi thường thêm voucher thiện chí 500.000đ.
- Theo dõi: - Quản lý cơ sở gọi điện nhận trách nhiệm và gửi toàn bộ hồ sơ y tế từ phòng khám.
- Áp dụng quy định cách ly tuyệt đối giữa các bé khác gia đình trong mọi khung giờ vận động.', true),
('Tài xế trễ giờ đón / trả bé > 45 phút
(Gây lỡ việc hoặc lỡ lịch hẹn của chủ)', 50, 50000, false, '[P2] Tài xế trễ giờ đón / trả bé > 45 phút
(Gây lỡ việc hoặc lỡ lịch hẹn của chủ)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ ạ. Do tuyến đường đang bị ùn tắc giao thông cục bộ nên tài xế chưa đến đúng giờ đã hẹn. Em đã kiểm tra định vị và tài xế đang cố gắng đến trong [X] phút nữa. Điều phối viên sẽ kiểm tra lại toàn bộ lộ trình và liên hệ xử lý ngay cho mình ạ.
- Hạn mức: (Sau khi kiểm tra lịch sử định vị GPS chuyến xe):
- Giảm từ 50% đến miễn phí 100% cước phí chuyến xe đó.
- Tặng mã giảm giá 15% cho cuốc xe kế tiếp.
- Theo dõi: - Gửi định vị GPS trực tiếp qua Zalo để khách theo dõi lộ trình di chuyển.
- Tối ưu lại thời gian điều phối và lộ trình tránh các điểm kẹt xe giờ cao điểm.', true),
('Khoang xe hôi mùi, máy lạnh yếu làm bé bị say xe
(Xe ngột ngạt hoặc chưa dọn mùi trước đó)', 100, 200000, true, '[P1] Khoang xe hôi mùi, máy lạnh yếu làm bé bị say xe
(Xe ngột ngạt hoặc chưa dọn mùi trước đó)
- Kịch bản: Dạ PawPal xin lỗi ba mẹ và thương bé nhiều lắm ạ. Tiêu chuẩn xe mát mẻ và khử mùi là bắt buộc tại PawPal. Em đã báo ngay cho điểm đến, khi xe vừa tới nơi, các bạn kỹ thuật viên Spa sẽ đón bé vào phòng mát, hỗ trợ lau mát người và xịt khử mùi dịu nhẹ cho con hoàn toàn miễn phí ạ.
- Hạn mức: (Sau khi xác minh thông tin với tài xế và trạm tiếp nhận):
- Miễn phí 100% cước phí chuyến xe Taxi đó.
- Tặng gói vệ sinh lau người khử mùi dịu nhẹ tại cơ sở.
- Phạt trừ điểm thi đua của tài xế không tuân thủ vệ sinh xe.
- Theo dõi: - Tiến hành khử mùi bằng máy ozone khoang xe sau chuyến chạy.
- Kiểm tra nhiệt độ điều hòa trước mỗi chuyến đón thú cưng.', true),
('Tính tiền sai hóa đơn / Quên áp mã khuyến mãi
(Tính trùng món, quẹt nhầm giá, quên trừ điểm)', 30, 30000, false, '[P3] Tính tiền sai hóa đơn / Quên áp mã khuyến mãi
(Tính trùng món, quẹt nhầm giá, quên trừ điểm)
- Kịch bản: Dạ PawPal xin lỗi ba mẹ vì sự cố nhầm lẫn hóa đơn ạ. Ba mẹ gửi giúp em ảnh chụp hóa đơn thanh toán kèm số tài khoản ngân hàng nhé ạ. Kế toán bên em sẽ đối soát dữ liệu trên phần mềm và hoàn trả lại số tiền chênh lệch ngay lập tức ạ.
- Hạn mức: (Sau khi Kế toán kiểm tra hóa đơn và log thu ngân):
- Chuyển khoản hoàn trả 100% số tiền chênh lệch ngay trong ca trực.
- Hoàn trả lại số điểm PawPoint bị thiếu (nếu có) + tặng bù 100 PawPoints thiện chí.
- Tặng voucher giảm 10% (tối đa 30.000đ).
- Theo dõi: - Gửi biên lai ủy nhiệm chi hoàn tiền qua Zalo/SMS cho khách.
- Yêu cầu thu ngân ca trực kiểm điểm và rà soát lại kỹ năng thanh toán.', true),
('Khách đến nơi nhưng hệ thống bị mất lịch hẹn
(Booking Crash / Trùng lịch ca khác)', 50, 50000, false, '[P2] Khách đến nơi nhưng hệ thống bị mất lịch hẹn
(Booking Crash / Trùng lịch ca khác)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ vì sự cố đồng bộ dữ liệu khiến lịch của bé chưa hiển thị trên ca máy ạ. Ba mẹ đừng lo lắng nhé, Lễ tân cơ sở sẽ bố trí bàn làm việc ưu tiên để kỹ thuật viên phục vụ bé ngay bây giờ, không để gia đình phải chờ lâu đâu ạ.
- Hạn mức: (Sau khi Lễ tân xác nhận mã đặt lịch hợp lệ trên app):
- Bố trí ca phục vụ ưu tiên ngay lập tức.
- Giảm trực tiếp 30% trên tổng hóa đơn dịch vụ hôm đó.
- Tặng thêm 200 PawPoints vào tài khoản của khách.
- Theo dõi: - Gửi báo cáo kỹ thuật IT kiểm tra log xung đột dữ liệu ca đặt trên hệ thống.
- CSKH gọi điện chăm sóc sau khi ca dịch vụ hoàn thành.', true),
('Khách bị trừ tiền online nhưng đơn hàng báo hủy
(Lỗi cổng thanh toán MoMo/VNPAY/Ngân hàng)', 50, 50000, false, '[P2] Khách bị trừ tiền online nhưng đơn hàng báo hủy
(Lỗi cổng thanh toán MoMo/VNPAY/Ngân hàng)
- Kịch bản: Dạ ba mẹ hoàn toàn yên tâm nhé ạ! Khoản tiền trừ đã được lưu vết an toàn tại ngân hàng. Ba mẹ gửi giúp em ảnh chụp màn hình trừ tiền thành công. Em đã báo bộ phận Kế toán đối soát và kích hoạt đơn hàng thủ công ngay cho mình để kịp giao cho bé ạ.
- Hạn mức: (Sau khi Kế toán kiểm tra sao kê cổng thanh toán):
- Kích hoạt đơn hàng thủ công (Manual Approval) ngay lập tức.
- Tặng voucher giảm 30.000đ cho đơn hàng sau vì sự bất tiện của hệ thống.
- Theo dõi: - Kế toán hoàn tất đối soát với cổng thanh toán trong vòng 24 giờ.
- Nhắn tin thông báo khi trạng thái đơn hàng trên app đã khớp thành công.', true),
('Tài khoản bị khóa nhầm do cơ chế chống gian lận
(Khách thân thiết bị quét nhầm vi phạm điểm)', 100, 200000, true, '[P1] Tài khoản bị khóa nhầm do cơ chế chống gian lận
(Khách thân thiết bị quét nhầm vi phạm điểm)
- Kịch bản: Dạ PawPal vô cùng xin lỗi ba mẹ vì sự bất tiện này ạ! Bộ lọc tự động của hệ thống đã nhận diện nhầm lẫn phiên đăng nhập. Em đã tạo yêu cầu khẩn lên đội ngũ Kỹ thuật để kiểm tra lịch sử tài khoản và mở khóa ngay lập tức cho ba mẹ ạ.
- Hạn mức: (Sau khi Kỹ thuật xác nhận tài khoản hoạt động bình thường):
- Mở khóa tài khoản ngay lập tức.
- Hoàn trả đúng hạng thành viên và tặng bù 500 PawPoints tích lũy.
- Duy trì mức chiết khấu ưu đãi VIP cho khách trong tháng kế tiếp.
- Theo dõi: - Quản lý CSKH gọi điện xin lỗi trực tiếp.
- Đưa số điện thoại/tài khoản khách vào danh sách Whitelist an toàn của hệ thống.', true),
('Nhân viên có hành vi thô bạo / Quát mắng / Đánh thú cưng
(Trích xuất camera hoặc thấy trực tiếp)', 200, 500000, true, '[P0] Nhân viên có hành vi thô bạo / Quát mắng / Đánh thú cưng
(Trích xuất camera hoặc thấy trực tiếp)
- Kịch bản: Dạ PawPal vô cùng bàng hoàng và chân thành cúi đầu xin lỗi ba mẹ ạ! Hành vi thô bạo với thú cưng là điều tuyệt đối CẤM kỵ tại PawPal. Em đã báo cáo khẩn đến Ban Giám Đốc để đình chỉ công tác nhân viên này và trích xuất camera xử lý kỷ luật nghiêm khắc. Quản lý cấp cao sẽ liên hệ trực tiếp với ba mẹ ngay bây giờ ạ!
- Hạn mức: (Sau khi Ban Quản lý kiểm tra camera xác thực vi phạm):
- Đình chỉ công tác nhân viên ngay lập tức.
- Miễn phí 100% toàn bộ dịch vụ của đợt này.
- Tặng voucher chăm sóc đặc biệt từ 500.000đ đến 1.000.000đ hoặc bồi hoàn tiền mặt tương đương.
- Hỗ trợ chi phí đưa bé đi kiểm tra tâm lý/sức khỏe tại phòng khám thú y nếu cần.
- Theo dõi: - T+15 phút: Quản lý chi nhánh gọi điện xin lỗi và gửi biên bản trích xuất camera.
- T+24h: Gửi văn bản thông báo quyết định xử lý kỷ luật nhân viên vi phạm.
- Gắn nhãn ưu tiên: Các lần chăm sóc sau chỉ do Trưởng ca trực tiếp tiếp nhận.', true),
('Nhân viên thái độ thiếu tôn trọng, lơ là bấm điện thoại
(Tiếp tân không chào, cộc lốc, để khách đợi', 50, 50000, false, '[P2] Nhân viên thái độ thiếu tôn trọng, lơ là bấm điện thoại
(Tiếp tân không chào, cộc lốc, để khách đợi lâu)
- Kịch bản: Dạ PawPal xin nhận lỗi sâu sắc cùng ba mẹ ạ. Thái độ đón tiếp chu đáo là tiêu chuẩn bắt buộc tại PawPal, việc nhân viên có thái độ thiếu lịch sự là hoàn toàn không thể chấp nhận. Em đã ghi nhận thời gian và chi nhánh để Quản lý cơ sở trích xuất camera quầy, xử lý kỷ luật nhân sự ngay ạ.
- Hạn mức: (Sau khi Quản lý cơ sở xem camera đối chiếu):
- Tặng voucher giảm 15% (tối đa 50.000đ) hoặc tặng 200 PawPoints.
- Tặng 01 món đồ chơi hoặc phần snack cho bé khi gia đình rời quầy.
- Theo dõi: - Quản lý ca trực lập tức ra quầy tiếp quản và phục vụ chu đáo.
- Đưa nhân viên vào danh sách đào tạo lại văn hóa ứng xử dịch vụ khách hàng.', true),
('Nhân viên chèo kéo ép mua dịch vụ / Vòi vĩnh tiền tip
(Liên tục ép gói dịch vụ đắt tiền, vòi tip)', 50, 50000, false, '[P2] Nhân viên chèo kéo ép mua dịch vụ / Vòi vĩnh tiền tip
(Liên tục ép gói dịch vụ đắt tiền, vòi tip)
- Kịch bản: Dạ PawPal chân thành xin lỗi ba mẹ về trải nghiệm không thoải mái này ạ. PawPal nghiêm cấm tuyệt đối mọi hành vi vòi tiền tip hay ép khách hàng sử dụng dịch vụ ngoài nhu cầu. Em đã chuyển phản ánh đến Quản lý chi nhánh để kiểm tra ca làm và chấn chỉnh nhân viên ngay lập tức ạ.
- Hạn mức: (Sau khi Quản lý chi nhánh xác minh phản ánh):
- Tặng voucher giảm giá 20% (tối đa 100.000đ) cho lần trải nghiệm dịch vụ kế tiếp.
- Tặng bù 100 PawPoints tích lũy.
- Theo dõi: - Quản lý chi nhánh gọi điện xin lỗi khách trong vòng 2 giờ.
- Tái phổ biến quy định “Không ép dịch vụ - Không vòi tiền tip” trên toàn cơ sở.', true),
('Làm mất / Trả nhầm đồ dùng cá nhân của bé
(Mất balo, lồng vận chuyển, yếm cổ, quần áo)', 50, 50000, false, '[P2] Làm mất / Trả nhầm đồ dùng cá nhân của bé
(Mất balo, lồng vận chuyển, yếm cổ, quần áo)
- Kịch bản: Dạ PawPal thành thật xin lỗi ba mẹ ạ! Do khâu đánh số gắn thẻ đồ dùng bị sơ suất nên các bạn đã để thất lạc phụ kiện của con. Em đã báo nhân viên trích xuất camera tủ đồ để tìm lại ngay. Trong trường hợp không tìm thấy trong 24h, PawPal cam kết bồi thường 100% món đồ mới cho ba mẹ ạ.
- Hạn mức: (Sau khi trích xuất camera xác nhận mất đồ):
- Đền bù 100% giá trị món đồ bị mất (mua mới hoặc hoàn tiền tương đương giá trị đồ).
- Tặng kèm 01 món phụ kiện tiện ích từ PawPal Shop.
- Theo dõi: - T+2h: Thông báo tiến độ tìm kiếm đồ qua camera cho khách.
- Nếu tìm thấy đồ: Cử shipper mang trả tận nhà khách miễn phí 100%.
- Cải tiến quy trình: Bắt buộc gắn thẻ mã số trùng khớp với vòng đeo tay của thú cưng.', true),
('Làm lộ thông tin cá nhân của khách hàng
(Nhân viên lấy số điện thoại làm phiền, gạ gẫm)', 100, 200000, true, '[P1] Làm lộ thông tin cá nhân của khách hàng
(Nhân viên lấy số điện thoại làm phiền, gạ gẫm)
- Kịch bản: Dạ PawPal xin nhận lỗi nghiêm khắc nhất về phản ánh này ạ. Bảo mật thông tin khách hàng là nguyên tắc bất biến tại PawPal. Việc nhân viên tùy tiện dùng số điện thoại khách hàng cho mục đích cá nhân là vi phạm pháp luật và quy chế công ty. Ban Giám Đốc sẽ xử lý sa thải nhân sự này ngay lập tức ạ!
- Hạn mức: (Sau khi kiểm tra tin nhắn/chứng cứ vi phạm):
- Quản lý cấp cao trực tiếp gọi điện xin lỗi và ký văn bản cam kết bảo mật.
- Tặng thẻ đặc quyền thành viên VIP trong 06 tháng.
- Tặng voucher trị giá 200.000đ áp dụng cho mọi dịch vụ mua sắm.
- Theo dõi: - Buộc nhân viên xóa thông tin, viết bản cam kết không liên lạc lại với khách.
- T+48h: Chuyên viên bảo mật liên hệ kiểm tra lại xem khách còn bị làm phiền không.', true),
('Giao nhầm bé thú cưng khi khách đến đón
(Giao nhầm giống chó/mèo có ngoại hình tương tự)', 200, 500000, true, '[P0] Giao nhầm bé thú cưng khi khách đến đón
(Giao nhầm giống chó/mèo có ngoại hình tương tự)
- Kịch bản: Dạ PawPal khẩn thiết xin lỗi ba mẹ ạ! Quy trình đối soát vòng mã định danh đã bị nhân viên bỏ qua tắc trách. PawPal đang điều động xe riêng đón bé về tận nhà bàn giao lại cho gia đình ngay lập tức và cam kết bé an toàn 100%. Quản lý chi nhánh đang trực tiếp xử lý vụ việc này ạ!
- Hạn mức: (Sau khi Quản lý xử lý đổi trả đúng hai bé):
- Miễn phí 100% toàn bộ dịch vụ của cả hai khách hàng bị trao nhầm bé.
- Xe Pet Taxi đưa đón đổi trả bé tận nơi trong 30 phút hoàn toàn miễn phí.
- Tặng voucher thiện chí từ 300.000đ đến 500.000đ cho mỗi gia đình.
- Theo dõi: - Nhân viên y tế cơ sở kiểm tra toàn diện thể trạng hai bé khi bàn giao.
- Ban hành quy chuẩn: Bắt buộc quét mã chip/vòng đeo tay có sự xác nhận của chủ trước khi rời sảnh.', true),
('Cơ sở vật chất gặp sự cố (Cúp điện, hỏng máy lạnh)
(Bé bị nóng, thở dốc trong phòng Pet Hotel)', 100, 200000, true, '[P1] Cơ sở vật chất gặp sự cố (Cúp điện, hỏng máy lạnh)
(Bé bị nóng, thở dốc trong phòng Pet Hotel)
- Kịch bản: Dạ PawPal vô cùng xin lỗi ba mẹ vì sự cố điều hòa cục bộ tại phòng của bé ạ. Đội kỹ thuật đã khắc phục và nhân viên bảo mẫu đã lập tức chuyển bé sang phòng VIP máy lạnh chạy ổn định, đồng thời cho bé uống bù nước mát. Hiện tại thể trạng của bé đã ổn định và rất ngoan ạ.
- Hạn mức: (Sau khi Quản lý khách sạn kiểm tra sự cố phòng):
- Miễn phí 100% tiền phòng của ngày xảy ra sự cố.
- Nâng cấp miễn phí lên phòng VIP/Luxury cho toàn bộ các ngày lưu trú còn lại.
- Nhân viên y tế cơ sở kiểm tra thân nhiệt và nhịp thở cho bé miễn phí.
- Theo dõi: - Cứ mỗi 2 tiếng gửi 01 video quay nhiệt độ phòng và tình trạng hoạt động của bé cho khách.
- Bảo trì toàn bộ hệ thống máy lạnh và máy phát điện dự phòng tại cơ sở.', true),
('Bé về nhà có mùi hôi lạ / Bị ẩm ướt lông chân
(Sấy lông chưa khô triệt để kẽ chân hoặc mùi nồng)', 30, 30000, false, '[P3] Bé về nhà có mùi hôi lạ / Bị ẩm ướt lông chân
(Sấy lông chưa khô triệt để kẽ chân hoặc mùi nồng)
- Kịch bản: Dạ PawPal xin lỗi ba mẹ nhiều ạ. Chắc chắn do phần lông tơ ở kẽ chân bé dày nên bạn nhân viên sấy chưa khô kỹ triệt để, hoặc mùi nước hoa không hợp với mũi bé. Em xin phép mời ba mẹ đưa bé ghé lại bất kỳ lúc nào để bên em sấy khô kỹ và xả lại bằng hương dịu nhẹ hoàn toàn miễn phí cho bé ạ.
- Hạn mức: (Sau khi xác minh thông tin ca làm):
- Miễn phí 01 lần sấy khô / tắm xả lại toàn diện khi khách đưa bé ghé lại.
- Hoặc cấp mã giảm giá 20% cho lần tắm kế tiếp.
- Tặng thêm 50 PawPoints tích lũy.
- Theo dõi: - Ghi chú hồ sơ bé: [Nhạy cảm mùi hương - Chỉ dùng sản phẩm tắm không mùi, sấy khô kỹ kẽ chân].
- Nhắc nhở kỹ thuật viên kiểm tra độ ẩm lông bằng giấy thấm trước khi bàn giao.', true),
('Khách bị mất lượt khuyến mãi Flash Sale do lỗi web/app
(Sập mạng, lỗi giỏ hàng lúc thanh toán)', 30, 30000, false, '[P3] Khách bị mất lượt khuyến mãi Flash Sale do lỗi web/app
(Sập mạng, lỗi giỏ hàng lúc thanh toán)
- Kịch bản: Dạ PawPal xin lỗi ba mẹ vì sự cố nghẽn mạng trong khung giờ Flash Sale khiến ba mẹ bị lỡ đơn đặt ạ! Ba mẹ gửi giúp em ảnh chụp giỏ hàng hoặc số điện thoại đăng ký tài khoản. Kỹ thuật viên sẽ kiểm tra lịch sử truy cập và cấp riêng mã mua hàng đúng giá ưu đãi cho mình ạ.
- Hạn mức: (Sau khi IT kiểm tra log truy cập giỏ hàng):
- Cấp mã giảm giá riêng (Private Coupon) áp dụng mức giá đúng bằng giá ưu đãi Flash Sale.
- Tặng thêm 50 PawPoints vào tài khoản của khách.
- Theo dõi: - CSKH gửi trực tiếp mã giảm giá riêng qua tin nhắn Zalo/SMS cho khách.
- Hỗ trợ khách hoàn tất đặt hàng trong ngày.', true),
('Bé bị vón cục lông trở lại sau 1-2 ngày Grooming
(Chải lông chưa kỹ lớp trong, vón cục)', 50, 50000, false, '[P2] Bé bị vón cục lông trở lại sau 1-2 ngày Grooming
(Chải lông chưa kỹ lớp trong, vón cục)
- Kịch bản: Dạ PawPal rất lấy làm tiếc vì lớp lông của bé chưa giữ được độ tơi xốp như mong đợi ạ. Với các dòng lông xoăn dày, nếu không gỡ từ chân lông sẽ dễ bị vón lại. PawPal xin mời ba mẹ đưa bé ghé lại, Kỹ thuật viên trưởng sẽ đích thân gỡ rối chân lông chuyên sâu và dưỡng mềm lại cho con hoàn toàn miễn phí ạ.
- Hạn mức: (Sau khi Kỹ thuật viên trưởng kiểm tra thực tế bộ lông của bé):
- Miễn phí dịch vụ gỡ rối chuyên sâu (trị giá 100.000đ - 150.000đ).
- Tặng 01 lược chải lông chuyên dụng (Slicker Brush) mang về chăm sóc tại nhà.
- Theo dõi: - Kỹ thuật viên trưởng hướng dẫn phụ huynh cách chải lông đúng hướng tại nhà.
- Đánh giá lại tay nghề và quy trình chải sấy của kỹ thuật viên ca trước.', true);

-- ------------------------------------------------------------------------------
-- BẢNG 10: chatbot_scenario_matrix (24 Ma trận kịch bản hội thoại chuẩn)
-- ------------------------------------------------------------------------------
INSERT INTO public.chatbot_scenario_matrix (scenario_name, sample_user_input, expected_sentiment, expected_tool_call, expected_handover, benchmark_status)
VALUES
('Đặt lịch tắm vệ sinh cho thú cưng', '[SCEN-SPA-01] Đặt hẹn khung giờ làm sạch cho cún. Các bước: Hỏi cân nặng bé, đề xuất khung giờ thợ còn trống và báo giá sơ bộ. Kết quả: Chuyển dữ liệu sang màn hình xác nhận thanh toán', 2, NULL, false, 'passed'),
('Tư vấn dinh dưỡng và Chọn thức ăn phù hợp', '[SC-01] Tìm đúng loại hạt/pate cho giống, độ tuổi hoặc thói quen ăn uống của bé.. Các bước: 1. Chào hỏi thân thiện + Hỏi thông tin bé: Loài (chó/mèo), giống, độ tuổi, cân nặng và khẩu vị/thói quen ăn.
2. Phân tích nhu cầu cơ bản (dễ tiêu hóa, kén ăn, mượt lông, kiểm soát cân nặng).
3. Đề xuất Top 2-3 sản phẩm có sẵn tại tiệm kèm giá, đặc điểm nổi bật và link xem sản phẩm.
4. Hướng dẫn khách bấm thêm vào giỏ hàng hoặc áp dụng mã ưu đãi nếu có.. Kết quả: Kết thúc tự động: Khách chọn sản phẩm và bấm đặt mua trực tiếp trên Website.', 2, NULL, false, 'passed'),
('Đặt lịch Spa và Grooming tạo kiểu', '[SC-02] Đặt lịch làm đẹp, chọn kỹ thuật viên và biết trước giá dịch vụ.. Các bước: 1. Hỏi nhu cầu làm đẹp (Tắm vệ sinh hay Cắt tỉa tạo kiểu) + Xin thông tin giống và cân nặng của bé.
2. Tra cứu bảng giá chuẩn xác theo phân cấp cân nặng (Dưới 5kg, 5-10kg...).
3. Hỏi ngày và khung giờ khách muốn đưa bé ghé tiệm.
4. Kiểm tra ca trống trên hệ thống, tóm tắt thông tin ca hẹn và hướng dẫn bấm nút [Xác nhận đặt lịch].. Kết quả: Kết thúc tự động: Hệ thống tạo mã lịch hẹn BKG-xxxx + Gửi tin nhắn xác nhận lịch hẹn vào Zalo/SMS của khách.', 2, 'search_spa_services', false, 'passed'),
('Đặt phòng Khách sạn thú cưng (Pet Hotel)', '[SC-03] Gửi bé lưu trú an toàn tại tiệm trong dịp lễ/công tác.. Các bước: 1. Hỏi ngày gửi, ngày đón, số lượng bé và loại phòng (Standard / VIP / Luxury Suite).
2. Nhắc nhở quy định nhận phòng: Bé khỏe mạnh, không có rận/nấm và không mắc bệnh truyền nhiễm.
3. Gợi ý các dịch vụ chăm sóc kèm theo: Chế độ ăn riêng, xem camera phòng, tắm sạch trước khi về.
4. Tạm tính chi phí trọn gói và hiển thị thông tin đặt cọc giữ chỗ.. Kết quả: Kết thúc tự động: Tạo đơn đặt phòng tạm tính + Chuyển hướng khách thanh toán đặt cọc 30% giữ phòng.', 2, 'check_hotel_rooms', false, 'passed'),
('Đặt xe Taxi Pet đưa đón tận nơi', '[SC-04] Cần xe riêng của tiệm đưa bé đến làm Spa hoặc đón bé về nhà.. Các bước: 1. Xác nhận địa chỉ đón/trả và khung giờ cần xe có mặt.
2. Hỏi thông tin bé (cân nặng, tính cách có sợ xe/say xe không) và quy cách lồng vận chuyển.
3. Hệ thống tính khoảng cách km từ tiệm đến nhà khách và báo giá cước di chuyển minh bạch.
4. Hiển thị tóm tắt chuyến đi và xác nhận lịch xe riêng của tiệm xuất phát.. Kết quả: Kết thúc tự động: Tạo mã chuyến xe TXI-xxxx + Cập nhật trạng thái xe khởi hành đón bé.', 2, 'book_taxi', false, 'passed'),
('Tra cứu tình trạng đơn hàng Shop', '[SC-05] Biết đơn hàng đang ở đâu, khi nào giao tới.. Các bước: 1. Hỏi số điện thoại đặt hàng hoặc mã đơn ORD-xxxx.
2. Tra cứu trạng thái đơn trên hệ thống (Đã đóng gói / Đang giao / Giao thành công).
3. Hiển thị vị trí đơn hàng, đơn vị giao hàng và thời gian giao dự kiến.
4. Cung cấp nút xem chi tiết đơn hàng hoặc liên hệ nhân viên nếu cần hỗ trợ gấp.. Kết quả: Kết thúc tự động: Khách nắm được thông tin đơn hàng và an tâm đóng khung chat.', 2, 'check_order_status', false, 'passed'),
('Tra cứu và Quản lý lịch hẹn (Đổi giờ / Hủy ca)', '[SC-06] Đổi ngày giờ lịch hẹn đã đặt hoặc xin hủy ca đột xuất.. Các bước: 1. Xác nhận mã lịch hẹn hoặc SĐT của khách, hiển thị thông tin ca hẹn hiện tại.
2. Nếu khách đổi giờ: Kiểm tra ca còn trống trên lịch tiệm, cập nhật lại lịch hẹn tức thì.
3. Nếu khách xin hủy ca: Hỏi lý do thiện chí, kiểm tra điều kiện hủy (trước ít nhất 2 tiếng) và hủy ca trên hệ thống.
4. Gửi tin nhắn xác nhận lịch đã đổi/hủy thành công.. Kết quả: Kết thúc tự động: Cập nhật hệ thống lịch hẹn và giải phóng bàn làm việc cho khách khác.', 2, NULL, false, 'passed'),
('Tra cứu điểm thưởng PawPoint và Đổi quà', '[SC-07] Xem điểm tích lũy, hạng thành viên và các ưu đãi đổi được.. Các bước: 1. Tra cứu thông tin hạng thành viên (Bạc / Vàng / Kim Cương) và số dư PawPoint hiện có theo SĐT.
2. Liệt kê quyền lợi chiết khấu theo hạng thẻ của khách.
3. Hiển thị danh mục quà tặng hoặc voucher có thể quy đổi theo số điểm hiện có.
4. Hỗ trợ khách đổi điểm lấy mã ưu đãi trực tiếp trong khung chat.. Kết quả: Kết thúc tự động: Trừ điểm trên ví + Lưu mã voucher vào tài khoản của khách.', 2, NULL, false, 'passed'),
('Khiếu nại giao trễ / Giao sai / Hỏng hàng (Shop)', '[SC-08] Phản ánh sản phẩm bị lỗi để được đổi hàng hoặc hoàn tiền.. Các bước: 1. Lắng nghe, xin lỗi thấu cảm về sự cố trải nghiệm của khách.
2. Yêu cầu khách gửi hình ảnh/video chụp kiện hàng thực tế nhận được (bao bì móp méo, sản phẩm giao sai/thiếu).
3. Ghi nhận mã đơn, tạo phiếu tiếp nhận sự cố vào hệ thống.
4. Thông báo nhân viên CSKH/Kho sẽ đối soát minh chứng và liên hệ xử lý bồi hoàn cho khách trong vòng 15-30 phút.. Kết quả: Chuyển giao nhân sự: Ghi nhận Ticket khiếu nại lên hệ thống quản trị để nhân viên kiểm tra minh chứng trước khi áp dụng đền bù.', 2, NULL, true, 'passed'),
('Khiếu nại bé bị trầy xước / Bị đau sau khi đi Spa về', '[SC-09] Làm rõ sự cố, được hỗ trợ chăm sóc y tế và xin lỗi chân thành.. Các bước: 1. Gửi lời xin lỗi chân thành và bày tỏ xót xa cùng gia đình.
2. Hỏi thăm vị trí vết thương của bé, hướng dẫn phụ huynh giữ sạch vết thương, tránh dính nước.
3. Yêu cầu khách gửi ảnh/video cận cảnh vết thương để cơ sở xác nhận ngay.
4. Trấn an cam kết trách nhiệm của tiệm và chuyển ngay cho Quản lý cơ sở tiếp nhận.. Kết quả: Chuyển giao khẩn cấp: Đổi trạng thái Ticket khẩn cấp (P1/P0), ngắt kịch bản tự động và kết nối Quản lý cơ sở gọi điện trực tiếp trong 5-10 phút.', 2, 'search_spa_services', true, 'passed'),
('Khiếu nại thái độ nhân viên phục vụ / Tài xế xe', '[SC-10] Phản ánh nhân viên gắt gỏng, bấm điện thoại lơ là hoặc thiếu trách nhiệm.. Các bước: 1. Lắng nghe trọn vẹn, tuyệt đối không bao biện hay đôi co với khách.
2. Thu thập thông tin: Tên nhân viên (nếu biết), khung giờ và vị trí xảy ra sự việc tại sảnh tiệm/trên xe.
3. Thay mặt tiệm chân thành xin lỗi khách và cam kết Quản lý sẽ trích xuất camera/kiểm tra để xử lý kỷ luật nghiêm.
4. Tạo Ticket phản ánh gửi lên Ban Quản lý.. Kết quả: Chuyển giao: Tạo Ticket nhân sự gửi Quản lý cửa hàng để gọi điện xin lỗi và thông báo kết quả giải quyết.', 2, NULL, true, 'passed'),
('Khách yêu cầu gặp nhân viên tư vấn người thật', '[SC-11] Khách không muốn chat tự động, cần người hỗ trợ giải quyết trực tiếp.. Các bước: 1. Xác nhận yêu cầu: Dạ em hiểu ba mẹ đang cần hỗ trợ trực tiếp từ nhân viên PawPal ạ.
2. Xin vắn tắt nội dung: Ba mẹ cho em xin thông tin ngắn gọn vấn đề mình cần giải quyết để em chuyển đúng chuyên viên phụ trách nhé ạ.
3. Đưa cuộc trò chuyện vào hàng đợi ưu tiên của nhân viên trực ca.
4. Thông báo thời gian dự kiến nhân sự phản hồi (trong 1-2 phút).. Kết quả: Chuyển giao trực tiếp: Nhân viên CSKH nhấn tiếp nhận ca chat trên hệ thống quản trị, Bot lùi về chế độ theo dõi.', 2, NULL, true, 'passed'),
('Sự cố thanh toán trừ tiền nhưng không ghi nhận đơn/lịch', '[SC-12] Xác minh tiền đã đi đâu, không muốn bị mất tiền.. Các bước: 1. Trấn an khách: Tiền thanh toán luôn được lưu vết an toàn tại ngân hàng/cổng thanh toán.
2. Hướng dẫn khách gửi ảnh chụp biên lai giao dịch thành công (có hiển thị mã giao dịch/mã tham chiếu).
3. Ghi nhận thông tin chuyển bộ phận Kế toán đối soát với cổng thanh toán.
4. Báo thời gian xử lý và hỗ trợ kích hoạt đơn/lịch hẹn thủ công cho khách.. Kết quả: Chuyển giao Kế toán: Chuyển phiếu đối soát cho Kế toán cửa hàng xác nhận khớp tiền và duyệt đơn.', 2, NULL, true, 'passed'),
('Khách hỏi sơ cứu khẩn cấp / Bé có dấu hiệu nguy kịch', '[SC-13] Cần hỗ trợ khẩn khi bé co giật, sặc nước, nuốt dị vật, khó thở.. Các bước: 1. Cảnh báo khẩn cấp: PawPal không có bác sĩ thú y chuyên khoa và không được phép chỉ định thuốc.
2. Cung cấp ngay Hotline cấp cứu và địa chỉ của Bệnh viện/Phòng khám Thú y đối tác gần nhất.
3. Nhắc nhở nguyên tắc an toàn khi đưa bé đi: Đặt bé nằm nghiêng một bên, giữ thông thoáng đường thở.
4. Hỏi khách có cần điều ngay xe Taxi Pet của tiệm sang hỗ trợ chở bé đi bệnh viện cấp cứu gấp không.. Kết quả: Kết thúc khẩn cấp: Cung cấp thông tin bệnh viện thú y gần nhất + Điều phối xe riêng hỗ trợ đưa đi cấp cứu nếu khách yêu cầu.', 2, NULL, false, 'passed'),
('Tư vấn chính sách đổi trả hàng hóa', '[SC-14] Tìm hiểu điều kiện và thời hạn được đổi trả sản phẩm đã mua.. Các bước: 1. Cung cấp quy định đổi trả của tiệm: Trong vòng 7 ngày đối với phụ kiện/đồ dùng còn nguyên tem; thức ăn/pate phải còn nguyên seal chưa khui.
2. Hướng dẫn cách thức đổi trả: Mang trực tiếp ghé qua tiệm hoặc gửi shipper về địa chỉ cửa hàng.
3. Hỏi mã đơn hàng để kiểm tra thời hạn mua hàng có hợp lệ không.. Kết quả: Kết thúc tự động: Khách nắm rõ quy định và được hướng dẫn tạo yêu cầu đổi hàng nếu đủ điều kiện.', 2, NULL, false, 'passed'),
('Khách hỏi địa chỉ tiệm và Giờ mở cửa', '[SC-15] Biết vị trí cửa hàng, chỗ đỗ xe, khung giờ làm việc.. Các bước: 1. Cung cấp địa chỉ chi tiết của cửa hàng kèm đường link bản đồ chỉ đường Google Maps.
2. Cung cấp khung giờ mở cửa (8:00 - 21:30 tất cả các ngày trong tuần) và hotline cửa hàng.
3. Thông tin về bãi đỗ xe ô tô và xe máy thuận tiện ngay trước cửa tiệm.
4. Gợi ý khách đặt lịch hẹn trước nếu muốn đưa bé qua làm đẹp để tránh phải chờ lâu.. Kết quả: Kết thúc tự động: Khách nhận được thông tin hướng dẫn đường đi và liên hệ.', 2, NULL, false, 'passed'),
('Khách buông lời thô tục, giận dữ mất kiểm soát', '[SC-16] Khách bức xúc gay gắt hoặc nhắn tin quấy rối hệ thống.. Các bước: 1. Tự động che mờ từ ngữ nhạy cảm trên màn hình trực chat.
2. Bot phản hồi điềm tĩnh, chuẩn mực: PawPal rất mong muốn lắng nghe và giải quyết thỏa đáng vấn đề của ba mẹ. Mong ba mẹ giữ bình tĩnh để nhân viên có thể hỗ trợ mình tốt nhất ạ.
3. Tập trung hỏi thẳng vào vấn đề khúc mắc cốt lõi.
4. Nếu tiếp tục xúc phạm sau nhắc nhở: Tạm ngắt phiên chat tự động và chuyển Quản lý xem xét.. Kết quả: Chuyển giao Quản lý: Lưu toàn bộ nhật ký cuộc trò chuyện để Quản lý cơ sở trực tiếp liên hệ xử lý tranh chấp.', 5, NULL, true, 'passed'),
('Tư vấn thú cưng khó tính / Hung dữ / Quá nhát người', '[SC-17] Hỏi tiệm có nhận làm Spa cho chó dữ hoặc mèo hay cào cắn không.. Các bước: 1. Đồng cảm với lo lắng của chủ: PawPal rất hiểu nhiều bé khi đến môi trường lạ sẽ sợ hãi và tự vệ ạ.
2. Hỏi thói quen của bé: Bé sợ tiếng máy sấy, kềm cắt móng hay sợ người lạ? Bé từng cắn ai chưa?
3. Giới thiệu giải pháp: Thợ cắt tỉa nhiều kinh nghiệm, sử dụng loa che an toàn, thao tác nhẹ nhàng kiên nhẫn, tuyệt đối không đánh mắng bé.
4. Khuyên chủ đưa bé đến sớm hơn 10-15 phút để bé làm quen không gian tiệm trước khi làm.. Kết quả: Kết thúc tự động: Đặt lịch dịch vụ kèm lưu cảnh báo: [Bé nhát/hung dữ - Bố trí Kỹ thuật viên trưởng thao tác nhẹ] trên hệ thống.', 2, NULL, false, 'passed'),
('Bé có sức khỏe đặc biệt (Mang thai, già yếu, bệnh tim/hậu phẫu)', '[SC-18] Hỏi bé đang mang thai hoặc già yếu có làm Spa hay gửi khách sạn được không.. Các bước: 1. Hỏi rõ tình trạng của bé: Bé mang thai tháng thứ mấy, có bệnh tim hoặc vết thương phẫu thuật chưa lành không.
2. Khuyến cáo an toàn: Tiệm xin phép từ chối các dịch vụ sấy nhiệt, cắt tỉa phức tạp hoặc gửi phòng đông đúc với các bé mang thai tháng cuối hoặc bệnh tim nặng để tránh sốc nhiệt/nguy hiểm cho bé.
3. Gợi ý giải pháp an toàn: Chỉ nhận gói tắm vệ sinh nhanh, xả mát nhẹ nhàng.
4. Khuyên chủ nên đưa bé đến kiểm tra tại phòng khám thú y chuyên khoa trước khi làm đẹp.. Kết quả: Kết thúc tư vấn an toàn: Bảo vệ an toàn cho thú cưng và tránh rủi ro trách nhiệm cho cửa hàng.', 6, NULL, false, 'passed'),
('Tư vấn dinh dưỡng và chăm sóc chó/mèo con mới đón về', '[SC-19] Chủ mới nuôi thú cưng, bối rối không biết chọn đồ ăn và đồ dùng ban đầu ra sao.. Các bước: 1. Chúc mừng gia đình có thêm thành viên mới bốn chân! 🐾
2. Hỏi độ tuổi của bé (dưới 2 tháng hay trên 2 tháng) để gợi ý thức ăn phù hợp: Sữa chuyên dụng, pate tập ăn dặm hoặc hạt ngâm mềm.
3. Gợi ý các vật dụng sinh hoạt thiết yếu: Bát ăn, khay cát vệ sinh, đệm ngủ êm ái, đồ chơi gặm an toàn.
4. Nhắc nhở chủ theo dõi thể trạng bé và đưa bé đi tiêm ngừa tại phòng khám thú y khi bé đủ ngày tuổi.. Kết quả: Kết thúc tự động: Giới thiệu danh mục các sản phẩm đồ dùng cho bé mới về nhà trên Website.', 2, NULL, false, 'passed'),
('Khách muốn gửi thú cưng dài ngày / Theo tháng', '[SC-20] Cần gửi bé lưu trú từ 2 tuần đến 1 tháng do đi công tác hoặc về quê.. Các bước: 1. Hỏi thời gian gửi cụ thể, giống loài và thói quen sinh hoạt của bé.
2. Cung cấp mức ưu đãi cho gói lưu trú dài ngày (chiết khấu theo tuần/tháng).
3. Giới thiệu cam kết chăm sóc: Cung cấp camera phòng 24/7 xem bất cứ lúc nào, dọn phòng khử khuẩn mỗi ngày, nhắn tin cập nhật tình hình bé thường xuyên.
4. Hẹn khách ghé xem phòng thực tế tại cửa hàng và thống nhất ký giấy gửi thú cưng.. Kết quả: Chuyển giao Quản lý: Kết nối Quản lý cửa hàng gọi điện tư vấn chi tiết và chuẩn bị phòng cho bé.', 2, NULL, true, 'passed'),
('Báo cáo nhân viên có hành vi vòi tiền tip / Ép dịch vụ', '[SC-21] Khách khó chịu vì nhân viên vòi tiền tip hoặc ép mua thêm gói đắt tiền.. Các bước: 1. Cảm ơn phản ánh thẳng thắn của khách và xin lỗi vì trải nghiệm không thoải mái.
2. Thu thập thông tin: Tên nhân viên (nếu nhớ) và khung giờ thực hiện dịch vụ tại tiệm.
3. Khẳng định nguyên tắc: PawPal tuyệt đối nghiêm cấm hành vi vòi tiền tip hoặc chèo kéo ép giá khách.
4. Tạo Ticket phản ánh gửi thẳng lên Quản lý cửa hàng để kiểm tra và xử lý kỷ luật.. Kết quả: Chuyển giao Quản lý: Quản lý cửa hàng liên hệ trực tiếp xin lỗi khách và kiểm điểm nhân sự ca trực.', 2, NULL, true, 'passed'),
('Yêu cầu xuất hóa đơn điện tử cho công ty', '[SC-22] Khách mua hàng/dịch vụ cần hóa đơn VAT để thanh toán chi phí doanh nghiệp.. Các bước: 1. Hỏi mã đơn hàng hoặc mã lịch hẹn vừa thanh toán tại tiệm.
2. Thu thập thông tin xuất hóa đơn: Tên công ty, Mã số thuế (MST), Địa chỉ doanh nghiệp và Email nhận hóa đơn.
3. Hướng dẫn khách kiểm tra lại thông tin cho chuẩn xác.
4. Thông báo thời gian phát hành hóa đơn điện tử gửi qua email trong vòng 24 - 48 giờ làm việc.. Kết quả: Chuyển giao Kế toán: Lưu dữ liệu vào hệ thống Kế toán để xuất hóa đơn điện tử gửi khách.', 2, NULL, true, 'passed'),
('Khách để quên đồ dùng / Tư trang cá nhân tại tiệm', '[SC-23] Khách làm rơi chìa khóa, nón bảo hiểm, ví, đồ chơi của bé tại sảnh tiệm.. Các bước: 1. Thu thập thông tin mô tả món đồ để quên (màu sắc, đặc điểm nhận dạng) và khung giờ khách có mặt tại tiệm.
2. Nhân viên lễ tân/bảo vệ đối chiếu với sổ ghi nhận đồ thất lạc nhặt được trong ngày.
3. Nếu đã tìm thấy: Gửi ảnh xác nhận với khách và giữ tại quầy lễ tân để khách ghé lấy (hoặc khách tự book xe lấy đồ nếu muốn).
4. Nếu chưa thấy: Báo nhân viên kiểm tra lại khu vực ghế chờ và camera sảnh.. Kết quả: Kết thúc hỗ trợ: Xác nhận giữ hộ đồ tại tiệm cho khách, không phát sinh chi phí vận chuyển bừa bãi.', 3, NULL, false, 'passed');

COMMIT;

SELECT 'PawPal Chatbot Custom Seed Data Inserted Successfully!' AS status;
