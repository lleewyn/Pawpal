-- 1. Tự động gán user_id cho người đang đăng nhập khi tạo ticket mới
ALTER TABLE public.support_ticket ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Gán các ticket mẫu (đang bị vô chủ) cho tài khoản "Nguyễn Lê Thi" (để bạn thấy trên màn hình)
UPDATE public.support_ticket
SET user_id = (SELECT id FROM auth.users WHERE email = 'lthi@gmail.com')
WHERE user_id IS NULL;
