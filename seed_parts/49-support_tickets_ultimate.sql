-- 1. Dọn dẹp sạch sẽ bảng cũ để làm lại từ đầu (tránh mọi lỗi vặt)
DROP TABLE IF EXISTS public.support_ticket_message CASCADE;
DROP TABLE IF EXISTS public.support_ticket CASCADE;

-- 2. Tạo lại bảng với cột user_id là VARCHAR(50) (Chuỗi ký tự) để chứa vừa khít chữ 'USER-004'
CREATE TABLE public.support_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
    rating INT CHECK (rating >= 1 AND rating <= 5),
    rating_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.support_ticket_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_ticket(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL, 
    agent_name VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật tính năng cho phép web đọc/ghi dữ liệu thoải mái (Anon role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_message TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_message TO authenticated;

ALTER TABLE public.support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_message ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can do all on support_ticket" ON public.support_ticket FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can do all on support_ticket_message" ON public.support_ticket_message FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Bơm lại dữ liệu mẫu với user_id chính xác 100% là 'USER-004'
INSERT INTO public.support_ticket (id, user_id, title, type, status, priority, rating, rating_comment, created_at, updated_at) 
VALUES 
('e0000000-0000-0000-0000-000000000001', 'USER-004', 'Lỗi không thanh toán được qua thẻ tín dụng', 'payment', 'completed', 'Cao', 5, 'Hỗ trợ rất nhanh và nhiệt tình', now() - interval '2 days', now() - interval '1 day'),
('e0000000-0000-0000-0000-000000000002', 'USER-004', 'Bé nhà mình bị dị ứng sau khi dùng sản phẩm', 'health', 'processing', 'Cao', NULL, NULL, now() - interval '5 hours', now()),
('e0000000-0000-0000-0000-000000000003', 'USER-004', 'Hỏi về lịch làm việc ngày lễ', 'other', 'completed', 'Bình thường', 4, 'Tốt', now() - interval '10 days', now() - interval '9 days'),
('e0000000-0000-0000-0000-000000000004', 'USER-004', 'Muốn đổi lịch hẹn spa cho bé Corgi', 'booking', 'pending', 'Bình thường', NULL, NULL, now() - interval '1 hour', now());

INSERT INTO public.support_ticket_message (ticket_id, sender_type, agent_name, content, created_at) VALUES 
('e0000000-0000-0000-0000-000000000001', 'user', NULL, 'Chào admin, mình không thể thanh toán bằng thẻ Visa được, hệ thống báo lỗi.', now() - interval '2 days'),
('e0000000-0000-0000-0000-000000000001', 'cskh', 'Nguyễn Văn B', 'Dạ PawPal xin lỗi vì sự bất tiện này. Bạn thử dùng thẻ nội địa hoặc Momo tạm giúp mình nhé, hệ thống Visa đang bảo trì ạ.', now() - interval '2 days' + interval '10 minutes'),
('e0000000-0000-0000-0000-000000000001', 'user', NULL, 'Mình đã thanh toán Momo thành công rồi, cảm ơn bạn.', now() - interval '1 day'),
('e0000000-0000-0000-0000-000000000002', 'user', NULL, 'Admin ơi, bé Cún nhà mình ăn hạt mới mua xong bị nổi mẩn đỏ, mình lo quá.', now() - interval '5 hours'),
('e0000000-0000-0000-0000-000000000002', 'cskh', 'Trần Thị C', 'Dạ bạn chụp lại thành phần gói hạt và tình trạng của bé giúp mình nhé, mình sẽ chuyển thông tin cho bác sĩ thú y ngay ạ!', now() - interval '4 hours'),
('e0000000-0000-0000-0000-000000000003', 'user', NULL, 'Sắp tới 30/4 cửa hàng có mở cửa không ạ?', now() - interval '10 days'),
('e0000000-0000-0000-0000-000000000003', 'cskh', 'Nguyễn Văn B', 'PawPal mở cửa xuyên lễ bạn nhé, bạn có thể ghé bất cứ lúc nào ạ!', now() - interval '9 days'),
('e0000000-0000-0000-0000-000000000004', 'user', NULL, 'Mình muốn dời lịch hẹn chiều nay sang sáng mai được không?', now() - interval '1 hour');
