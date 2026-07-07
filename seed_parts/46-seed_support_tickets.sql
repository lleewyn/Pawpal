-- Cấp quyền truy cập cho anon role (vì mặc định bảng mới tạo chưa cấp quyền)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_message TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_message TO authenticated;

-- Xóa dữ liệu cũ (nếu có) để tránh trùng lặp
DELETE FROM public.support_ticket_message;
DELETE FROM public.support_ticket;

-- Sinh dữ liệu mẫu (Support Tickets) cho các khách hàng
-- Customer 2: d0000000-0000-0000-0000-000000000002
INSERT INTO public.support_ticket (id, title, type, status, priority, rating, rating_comment, created_at, updated_at) 
VALUES 
('e0000000-0000-0000-0000-000000000001', 'Lỗi không thanh toán được qua thẻ tín dụng', 'payment', 'completed', 'Cao', 5, 'Hỗ trợ rất nhanh và nhiệt tình', now() - interval '2 days', now() - interval '1 day'),
('e0000000-0000-0000-0000-000000000002', 'Bé nhà mình bị dị ứng sau khi dùng sản phẩm', 'health', 'processing', 'Cao', NULL, NULL, now() - interval '5 hours', now());

-- Customer 5: d0000000-0000-0000-0000-000000000005
INSERT INTO public.support_ticket (id, title, type, status, priority, rating, rating_comment, created_at, updated_at) 
VALUES 
('e0000000-0000-0000-0000-000000000003', 'Hỏi về lịch làm việc ngày lễ', 'other', 'completed', 'Bình thường', 4, 'Tốt', now() - interval '10 days', now() - interval '9 days');

-- Customer 6: d0000000-0000-0000-0000-000000000006
INSERT INTO public.support_ticket (id, title, type, status, priority, rating, rating_comment, created_at, updated_at) 
VALUES 
('e0000000-0000-0000-0000-000000000004', 'Muốn đổi lịch hẹn spa cho bé Corgi', 'booking', 'pending', 'Bình thường', NULL, NULL, now() - interval '1 hour', now());

-- Sinh tin nhắn mẫu cho các ticket trên
INSERT INTO public.support_ticket_message (ticket_id, sender_type, agent_name, content, created_at) VALUES 
-- Ticket 1
('e0000000-0000-0000-0000-000000000001', 'user', NULL, 'Chào admin, mình không thể thanh toán bằng thẻ Visa được, hệ thống báo lỗi.', now() - interval '2 days'),
('e0000000-0000-0000-0000-000000000001', 'cskh', 'Nguyễn Văn B', 'Dạ PawPal xin lỗi vì sự bất tiện này. Bạn thử dùng thẻ nội địa hoặc Momo tạm giúp mình nhé, hệ thống Visa đang bảo trì ạ.', now() - interval '2 days' + interval '10 minutes'),
('e0000000-0000-0000-0000-000000000001', 'user', NULL, 'Mình đã thanh toán Momo thành công rồi, cảm ơn bạn.', now() - interval '1 day'),

-- Ticket 2
('e0000000-0000-0000-0000-000000000002', 'user', NULL, 'Admin ơi, bé Cún nhà mình ăn hạt mới mua xong bị nổi mẩn đỏ, mình lo quá.', now() - interval '5 hours'),
('e0000000-0000-0000-0000-000000000002', 'cskh', 'Trần Thị C', 'Dạ bạn chụp lại thành phần gói hạt và tình trạng của bé giúp mình nhé, mình sẽ chuyển thông tin cho bác sĩ thú y ngay ạ!', now() - interval '4 hours'),

-- Ticket 3
('e0000000-0000-0000-0000-000000000003', 'user', NULL, 'Sắp tới 30/4 cửa hàng có mở cửa không ạ?', now() - interval '10 days'),
('e0000000-0000-0000-0000-000000000003', 'cskh', 'Nguyễn Văn B', 'PawPal mở cửa xuyên lễ bạn nhé, bạn có thể ghé bất cứ lúc nào ạ!', now() - interval '9 days'),

-- Ticket 4
('e0000000-0000-0000-0000-000000000004', 'user', NULL, 'Mình muốn dời lịch hẹn chiều nay sang sáng mai được không?', now() - interval '1 hour');
