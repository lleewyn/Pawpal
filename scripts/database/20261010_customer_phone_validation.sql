-- Số điện thoại khách hàng mới phải gồm đúng 10 chữ số.
CREATE OR REPLACE FUNCTION public.validate_customer_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.phone_main IS NOT NULL AND NEW.phone_main !~ '^\\d{10}$' THEN
        RAISE EXCEPTION 'Số điện thoại phải gồm đúng 10 chữ số';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_customer_phone ON public.customer;
CREATE TRIGGER trg_validate_customer_phone
BEFORE INSERT OR UPDATE OF phone_main ON public.customer
FOR EACH ROW EXECUTE FUNCTION public.validate_customer_phone();
