-- Gỡ ràng buộc khoá ngoại
ALTER TABLE public.support_ticket DROP CONSTRAINT IF EXISTS support_ticket_user_id_fkey;

-- Chuyển kiểu dữ liệu của user_id từ UUID sang VARCHAR để khớp với Frontend
ALTER TABLE public.support_ticket ALTER COLUMN user_id TYPE VARCHAR(50);

-- Gán lại các ticket mẫu cho ID của Frontend (USER-004)
UPDATE public.support_ticket
SET user_id = 'USER-004'
WHERE id IN (
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000004'
);
