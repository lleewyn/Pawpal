-- Retain the original link RPC's protection for legacy +84/0084 phone aliases.
BEGIN;
DO $patch$
DECLARE definition text:=pg_get_functiondef('public.complete_guest_customer_auth(text,uuid,text,text)'::regprocedure);
 needle text:='customer_id<>c.id AND phone_number=p_phone AND customer_id IS DISTINCT FROM target.id';
BEGIN
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'unexpected_guest_phone_guard';END IF;
 EXECUTE replace(definition,needle,$new$customer_id<>c.id AND regexp_replace(phone_number,'[[:space:]().-]','','g') IN(p_phone,'84'||substring(p_phone FROM 2),'+84'||substring(p_phone FROM 2),'0084'||substring(p_phone FROM 2)) AND customer_id IS DISTINCT FROM target.id$new$);
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
