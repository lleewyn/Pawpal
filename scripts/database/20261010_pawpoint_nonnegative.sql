-- Không cho số dư Pawpoint âm và đảm bảo điểm là số nguyên.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_membership_points_nonnegative'
    ) THEN
        ALTER TABLE public.customer_membership
            ADD CONSTRAINT customer_membership_points_nonnegative
            CHECK (total_paw_points >= 0 AND total_paw_points = floor(total_paw_points));
    END IF;
END $$;
