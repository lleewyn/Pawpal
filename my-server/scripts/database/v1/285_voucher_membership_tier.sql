BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.voucher ADD COLUMN IF NOT EXISTS minimum_membership_tier_id uuid REFERENCES public.membership_tier(id);
CREATE OR REPLACE FUNCTION pawpal_private.voucher_membership_allows(p_voucher uuid,p_customer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.voucher v WHERE v.id=p_voucher AND (v.minimum_membership_tier_id IS NULL OR EXISTS(
  SELECT 1 FROM public.membership_tier required JOIN public.customer_membership m ON m.customer_id=p_customer
  JOIN public.membership_tier actual ON actual.id=m.membership_tier_id
  WHERE required.id=v.minimum_membership_tier_id AND required.is_active AND actual.is_active AND actual.minimum_expenditure>=required.minimum_expenditure)));
$$;
REVOKE ALL ON FUNCTION pawpal_private.voucher_membership_allows(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.validate_voucher_membership_config() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.minimum_membership_tier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.membership_tier WHERE id=NEW.minimum_membership_tier_id AND is_active) THEN RAISE EXCEPTION 'invalid_voucher_membership_tier' USING ERRCODE='22023';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.validate_voucher_membership_config() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS voucher_membership_config ON public.voucher;
CREATE TRIGGER voucher_membership_config BEFORE INSERT OR UPDATE OF minimum_membership_tier_id ON public.voucher FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_voucher_membership_config();
DO $$
DECLARE body text;signature text;needle text;
BEGIN
 body:=pg_get_functiondef('public.save_admin_setting_record(uuid,text,uuid,jsonb,jsonb,boolean)'::regprocedure);
 IF strpos(body,'''minimum_membership_tier_id''')=0 THEN
  needle:=$n$'applicable_for','max_usage']$n$;
  IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_settings_voucher_fields';END IF;
  EXECUTE replace(body,needle,$n$'applicable_for','max_usage','minimum_membership_tier_id']$n$);
 END IF;
 FOREACH signature IN ARRAY ARRAY['public.quote_admin_sales_order(uuid,jsonb,jsonb)','pawpal_private.quote_own_sales_core(uuid,jsonb,jsonb)','pawpal_private.quote_guest_sales_core(uuid,jsonb,jsonb)'] LOOP
  body:=pg_get_functiondef(signature::regprocedure);
  IF strpos(body,'voucher_membership_allows')=0 THEN
   needle:='OR NOT voucher.is_active';IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_voucher_quote_definition';END IF;
   EXECUTE replace(body,needle,needle||' OR NOT pawpal_private.voucher_membership_allows(voucher.id,p_customer_id)');
  END IF;
 END LOOP;
 body:=pg_get_functiondef('pawpal_private.validate_voucher_use()'::regprocedure);
 IF strpos(body,'voucher_membership_allows')=0 THEN
  needle:=$n$IF NEW.status='applied' THEN$n$;IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_voucher_redemption_definition';END IF;
  EXECUTE replace(body,needle,needle||E'\n IF NOT pawpal_private.voucher_membership_allows(v.id,owner_id) THEN RAISE EXCEPTION ''sales_voucher_not_applicable'' USING ERRCODE=''22023'';END IF;');
 END IF;
 body:=pg_get_functiondef('public.redeem_own_loyalty_voucher(uuid,uuid,text)'::regprocedure);
 IF strpos(body,'voucher_membership_allows')=0 THEN
  needle:='IF md5(to_jsonb(v)::text)<>p_expected THEN';IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_loyalty_voucher_definition';END IF;
  EXECUTE replace(body,needle,'IF NOT pawpal_private.voucher_membership_allows(v.id,cid) THEN RAISE EXCEPTION ''Hạng thành viên chưa đủ điều kiện đổi ưu đãi này.'' USING ERRCODE=''22023'';END IF;'||E'\n '||needle);
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
