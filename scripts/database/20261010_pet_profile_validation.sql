-- Bảo vệ dữ liệu thú cưng khi tạo từ hồ sơ khách hàng.
CREATE OR REPLACE FUNCTION public.validate_pet_profile_data()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.pet_name := regexp_replace(trim(COALESCE(NEW.pet_name, '')), '\\s+', ' ', 'g');
    IF NEW.pet_name = '' THEN
        RAISE EXCEPTION 'Tên thú cưng là bắt buộc khi tạo hồ sơ thú cưng';
    END IF;
    IF NEW.weight IS NOT NULL AND NEW.weight <= 0 THEN
        RAISE EXCEPTION 'Cân nặng thú cưng phải lớn hơn 0';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_pet_profile_data ON public.pet_profile;
CREATE TRIGGER trg_validate_pet_profile_data
BEFORE INSERT OR UPDATE OF pet_name, weight ON public.pet_profile
FOR EACH ROW EXECUTE FUNCTION public.validate_pet_profile_data();
