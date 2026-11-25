-- ==============================================================================
-- PAWPAL-ER CHATBOT SEED DATA TEMPLATE
-- File: scripts/database/20261007_chatbot_seed_data_template.sql
-- Description: Mẫu nạp dữ liệu cho 10 bảng cấu hình AI và quy tắc nghiệp vụ.
--              Bạn có thể chỉnh sửa/bổ sung nội dung tại đây trước khi thực thi.
-- ==============================================================================

-- 1. BẢNG 5: chatbot_sentiment_tier (5 cấp độ cảm xúc)
INSERT INTO public.chatbot_sentiment_tier (level, name, color_badge, sla_seconds, description)
VALUES
    (1, 'Hài lòng & Tích cực', '#165335', 300, 'Khách hàng khen ngợi, cảm ơn hoặc hài lòng với dịch vụ.'),
    (2, 'Trung tính & Tham khảo', '#20495E', 180, 'Khách hàng tra cứu giờ giấc, bảng giá, dịch vụ thông thường.'),
    (3, 'Lo âu & Cần tư vấn', '#734718', 120, 'Khách hàng lo lắng về vết tiêm, tập tính của bé, thời tiết.'),
    (4, 'Bực bội & Thất vọng', '#D97706', 60, 'Sự cố giao trễ >2h, đơn hàng bị sai, lỗi trừ tiền thanh toán.'),
    (5, 'Giận dữ & Khẩn cấp', '#DC2626', 30, 'Bé bị thương, ngộ độc, đe dọa bóc phốt, văng tục gay gắt.')
ON CONFLICT (level) DO UPDATE SET 
    name = EXCLUDED.name, 
    color_badge = EXCLUDED.color_badge, 
    sla_seconds = EXCLUDED.sla_seconds, 
    description = EXCLUDED.description;

-- 2. BẢNG 1: chatbot_system_prompt
INSERT INTO public.chatbot_system_prompt (prompt_key, channel, persona_name, tone_of_voice, content, is_active)
VALUES
    ('default_guest', 'web', 'PawPal Bot', 'Ấn cần, thân thiện, dễ thương', 
     'Bạn là Trợ lý AI siêu cấp đáng yêu của PawPal. Xưng hô là PawPal và gọi khách là sen, gọi thú cưng là boss/bé cưng. Tư vấn bằng tiếng Việt, tuyệt đối KHÔNG DÙNG EMOJI, dùng in đậm để làm nổi bật.', true),
    ('urgent_deescalate', 'web', 'PawPal Xoa Dịu', 'Chân thành, đồng cảm, lắng nghe', 
     'Khách hàng đang bức xúc. Tuyệt đối không cãi lý hoặc đưa ra lý do giải thích. Lập tức xin lỗi chân thành, lắng nghe và đề xuất kết nối chuyên viên CSKH hỗ trợ ngay.', true),
    ('admin_copilot', 'admin', 'PawPal Copilot Nội Bộ', 'Chuyên nghiệp, súc tích, nghiệp vụ', 
     'Bạn là Trợ lý quản trị viên nội bộ PawPal. Trả lời súc tích, chính xác theo số liệu kinh doanh, chính sách vận hành và quy chuẩn ngành thú cưng.', true)
ON CONFLICT (prompt_key) DO UPDATE SET content = EXCLUDED.content;

-- 3. BẢNG 3: chatbot_profanity_filter (Bộ lọc từ cấm & từ nhạy cảm)
INSERT INTO public.chatbot_profanity_filter (keyword, severity, action, replacement_text, is_active)
VALUES
    ('đm', 'high', 'mask', '***', true),
    ('dm', 'high', 'mask', '***', true),
    ('đmm', 'high', 'mask', '***', true),
    ('vcl', 'high', 'mask', '***', true),
    ('cl', 'high', 'mask', '***', true),
    ('địt', 'critical', 'mask', '***', true),
    ('lồn', 'critical', 'mask', '***', true),
    ('buồi', 'critical', 'mask', '***', true),
    ('cặc', 'critical', 'mask', '***', true),
    ('chó chết', 'high', 'mask', '***', true),
    ('mẹ mày', 'high', 'mask', '***', true),
    ('lừa đảo', 'high', 'escalate', 'nghi vấn giao dịch', true),
    ('bóc phốt', 'high', 'escalate', 'phản ánh công khai', true),
    ('mất tiền', 'high', 'escalate', 'sự cố thanh toán', true),
    ('chảy máu', 'critical', 'escalate', 'sự cố sức khỏe khẩn cấp', true),
    ('ngộ độc', 'critical', 'escalate', 'sự cố sức khỏe khẩn cấp', true),
    ('chết', 'critical', 'escalate', 'sự cố nghiêm trọng', true)
ON CONFLICT DO NOTHING;

-- 4. BẢNG 4: chatbot_canned_response (Tin nhắn mẫu một chạm)
INSERT INTO public.chatbot_canned_response (shortcut, title, content, category, usage_count, is_active)
VALUES
    ('/takeover', 'Chào tiếp nhận cuộc trò chuyện', 
     'Dạ PawPal xin chào sen! Em là chuyên viên CSKH phụ trách hỗ trợ trực tiếp cho sen đây ạ. Em đã nắm được thông tin sự việc và sẽ giải quyết ngay cho sen nhé ạ.', 'general', 10, true),
    ('/sorry_delay', 'Xin lỗi vì đơn hàng giao trễ', 
     'Dạ PawPal thành thật cáo lỗi cùng sen vì đơn hàng bị chậm trễ do ảnh hưởng thời tiết/bưu cục. Em đang hối thúc tài xế ưu tiên giao gấp cho sen trong 30 phút tới ạ.', 'delivery', 15, true),
    ('/reward_50pt', 'Tạ lỗi và tặng 50 điểm Pawpoint', 
     'Dạ để tạ lỗi vì sự bất tiện này, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.', 'compensation', 25, true),
    ('/request_photo', 'Hướng dẫn gửi ảnh chụp sự cố', 
     'Dạ sen chụp giúp em hình ảnh rõ nét của sản phẩm bị lỗi / tình trạng của bé qua khung chat này để em đối soát bảo hành lập tức cho sen nhé ạ.', 'complaint', 8, true),
    ('/close_resolved', 'Chào kết thúc ca hỗ trợ thành công', 
     'Dạ sự cố đã được xử lý hoàn tất rồi ạ. Cảm ơn sen đã luôn tin tưởng và đồng hành cùng PawPal. Chúc sen và bé cưng luôn vui khỏe ạ!', 'general', 12, true)
ON CONFLICT (shortcut) DO UPDATE SET content = EXCLUDED.content;

-- 5. BẢNG 9: chatbot_compensation_policy (Khung bồi hoàn thiện chí)
INSERT INTO public.chatbot_compensation_policy (issue_type, max_points, max_discount_vnd, approval_required, description, is_active)
VALUES
    ('Giao hàng trễ >2 giờ', 50, 20000, false, 'Áp dụng khi đơn hỏa tốc hoặc giao hàng tiêu chuẩn trễ hẹn cam kết.', true),
    ('Hủy lịch hẹn do sự cố cửa hàng', 100, 50000, false, 'Áp dụng khi kỹ thuật viên bận đột xuất hoặc cúp điện/hỏng thiết bị.', true),
    ('Giao nhầm sản phẩm', 150, 50000, false, 'Đổi trả miễn phí tận nhà + tặng điểm tạ lỗi.', true),
    ('Sự cố thú cưng trầy xước nhẹ', 200, 100000, true, 'Hỗ trợ chi phí thuốc men + voucher spa miễn phí lần sau.', true)
ON CONFLICT DO NOTHING;

-- 6. BẢNG 8: chatbot_handover_rule (Quy tắc bàn giao người thật)
INSERT INTO public.chatbot_handover_rule (condition_name, trigger_type, threshold_value, auto_assign_role, sla_seconds, is_active)
VALUES
    ('Cảm xúc tiêu cực cấp độ 4 hoặc 5', 'sentiment_threshold', '>=4', 'cskh', 60, true),
    ('Khách yêu cầu gặp người thật', 'user_request', 'gặp nhân viên|người thật|gọi quản lý', 'cskh', 60, true),
    ('Từ khóa sự cố sức khỏe thú cưng', 'keyword', 'chảy máu|ngộ độc|bị thương', 'ky_thuat_vien', 30, true),
    ('Bot xin lỗi 2 lần liên tiếp', 'bot_loop', '>=2', 'cskh', 90, true),
    ('Sự cố thanh toán mất tiền', 'keyword', 'mất tiền|trừ tiền|lừa đảo', 'ke_toan', 60, true)
ON CONFLICT DO NOTHING;
