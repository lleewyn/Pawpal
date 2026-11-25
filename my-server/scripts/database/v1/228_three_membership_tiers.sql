BEGIN;

-- 1. Chuyển toàn bộ hội viên hạng Đồng sang hạng Bạc
UPDATE public.customer_membership
SET membership_tier_id = '22222222-2222-2222-2222-222222222222'
WHERE membership_tier_id = '11111111-1111-1111-1111-111111111111';

-- 2. Vô hiệu hóa và ẩn hạng Đồng để hệ thống chỉ còn đúng 3 hạng chuẩn: Bạc, Vàng, Kim Cương
UPDATE public.membership_tier
SET is_active = false,
    updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111' OR tier_name = 'Đồng';

-- 3. Cập nhật ngưỡng chi tiêu và mô tả chuẩn cho 3 hạng thành viên:
-- Hạng Bạc (Silver): Tổng chi tiêu < 5.000.000 VNĐ (ngưỡng ban đầu = 0)
UPDATE public.membership_tier
SET minimum_expenditure = 0,
    discount_percent = 5,
    description = 'Hạng Bạc: Tổng chi tiêu dưới 5.000.000 VNĐ.',
    is_active = true,
    updated_at = now()
WHERE id = '22222222-2222-2222-2222-222222222222' OR tier_name = 'Bạc';

-- Hạng Vàng (Gold): Tổng chi tiêu từ 5.000.000 - 15.000.000 VNĐ (ngưỡng = 5.000.000 VNĐ)
UPDATE public.membership_tier
SET minimum_expenditure = 5000000,
    discount_percent = 10,
    description = 'Hạng Vàng: Tổng chi tiêu từ 5.000.000 đến 15.000.000 VNĐ.',
    is_active = true,
    updated_at = now()
WHERE id = '33333333-3333-3333-3333-333333333333' OR tier_name = 'Vàng';

-- Hạng Kim Cương (Diamond): Tổng chi tiêu > 15.000.000 VNĐ (ngưỡng = 15.000.000 VNĐ)
UPDATE public.membership_tier
SET minimum_expenditure = 15000000,
    discount_percent = 15,
    description = 'Hạng Kim Cương: Tổng chi tiêu trên 15.000.000 VNĐ.',
    is_active = true,
    updated_at = now()
WHERE id = '44444444-4444-4444-4444-444444444444' OR tier_name = 'Kim Cương';

NOTIFY pgrst, 'reload schema';
COMMIT;
