-- Không cho phép tạo hồ sơ khách hàng thiếu họ tên hoặc tên dưới 2 ký tự.
CREATE OR REPLACE FUNCTION public.validate_customer_profile_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.full_name := regexp_replace(trim(COALESCE(NEW.full_name, '')), '\\s+', ' ', 'g');
    IF NEW.full_name = '' THEN
        RAISE EXCEPTION 'Họ tên khách hàng là bắt buộc';
    END IF;
    IF char_length(NEW.full_name) < 2 THEN
        RAISE EXCEPTION 'Họ tên khách hàng phải có ít nhất 2 ký tự';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_customer_profile_name ON public.customer_profile;
CREATE TRIGGER trg_validate_customer_profile_name
BEFORE INSERT OR UPDATE OF full_name ON public.customer_profile
FOR EACH ROW EXECUTE FUNCTION public.validate_customer_profile_name();
