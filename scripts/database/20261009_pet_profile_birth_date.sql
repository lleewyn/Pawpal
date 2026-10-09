-- Bảo đảm ngày sinh thú cưng là ngày lịch hợp lệ và không nằm trong tương lai.
CREATE OR REPLACE FUNCTION public.validate_pet_profile_birth_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > CURRENT_DATE THEN
        RAISE EXCEPTION 'Ngày sinh thú cưng không được nằm trong tương lai.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pet_profile_birth_date_validation ON public.pet_profile;

CREATE TRIGGER pet_profile_birth_date_validation
    BEFORE INSERT OR UPDATE OF date_of_birth ON public.pet_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pet_profile_birth_date();
