-- Bảo đảm mọi hồ sơ thú cưng đều có cân nặng dương trong Supabase.
-- Dọn các giá trị cũ không hợp lệ trước khi áp dụng ràng buộc.
UPDATE public.pet_profile
SET weight = NULL
WHERE weight <= 0;

ALTER TABLE public.pet_profile
    ALTER COLUMN weight SET NOT NULL;

ALTER TABLE public.pet_profile
    DROP CONSTRAINT IF EXISTS pet_profile_weight_positive;

ALTER TABLE public.pet_profile
    ADD CONSTRAINT pet_profile_weight_positive CHECK (weight > 0);
