-- Hồ sơ tự phục vụ V1. Không đổi bảng, dữ liệu nguồn hay thông tin Auth.
BEGIN;
-- Giữ logic liên kết đã triển khai, bỏ bút toán chào mừng hard-code dùng cột cũ.
-- Chỉ thay đúng đoạn đã đối chiếu; thay đổi bất ngờ phải dừng migration.
DO $migration$
DECLARE source text; obsolete text;
BEGIN
 source:=replace(pg_get_functiondef('public.complete_customer_auth(uuid,text,text)'::regprocedure),chr(13),'');
 obsolete:=$old$INSERT INTO public.paw_point_transaction (customer_id, points, balance_after, description)
        VALUES (v_customer_id, 50, 50, 'Thưởng thành viên mới đăng ký tài khoản');$old$;
 IF strpos(source,obsolete)>0 THEN
  source:=replace(source,obsolete,'NULL; -- Chưa tự cộng điểm khi đăng ký.');
  EXECUTE source;
 ELSIF strpos(source,'balance_after')>0 THEN
  RAISE EXCEPTION 'Unexpected registration function; review required';
 END IF;
END $migration$;
CREATE OR REPLACE FUNCTION public.customer_profile_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer; result jsonb; addresses jsonb; phone text;
BEGIN
 SELECT * INTO c FROM public.customer WHERE auth_user_id=auth.uid() AND customer_status='active';
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Phiên khách hàng không hợp lệ' USING ERRCODE='42501'; END IF;
 SELECT phone_number INTO phone FROM public.customer_phone WHERE customer_id=c.id ORDER BY is_primary DESC,id LIMIT 1;
 -- V1 lưu địa chỉ dạng văn bản; giữ tương thích với form hiện có.
 SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object(
  'street_address',CASE WHEN strpos(a.street_address,',')>0 THEN regexp_replace(a.street_address,',[^,]*$','') ELSE a.street_address END,
  'district',CASE WHEN strpos(a.street_address,',')>0 THEN btrim(substring(a.street_address FROM '[^,]*$')) ELSE '' END,
  'ward','') ORDER BY a.id),'[]'::jsonb) INTO addresses FROM public.customer_address a WHERE customer_id=c.id;
 SELECT jsonb_build_object('id',c.id,'phone',coalesce(phone,''),'email',coalesce(c.contact_email,''),
  'name',coalesce((SELECT full_name FROM public.customer_profile WHERE customer_id=c.id),''),'addresses',addresses,
  'customer_updated_at',c.updated_at) INTO result;
 RETURN result||jsonb_build_object('revision',md5(result::text));
END $$;

CREATE OR REPLACE FUNCTION public.customer_profile_save(p_name text,p_email text,p_addresses jsonb,p_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer; a jsonb; old public.customer_address; aid uuid; kept uuid[]:='{}';
 name_value text:=btrim(p_name); email_value text:=nullif(btrim(p_email),''); phone text;
street text; district text; province_value text; ward text; address_keys text[]:='{}'; address_key text;
BEGIN
 SELECT * INTO c FROM public.customer WHERE auth_user_id=auth.uid() AND customer_status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Phiên khách hàng không hợp lệ' USING ERRCODE='42501'; END IF;
 -- Snapshot kiểm tra cả tài khoản nhân sự; khóa các hàng con trước khi đối chiếu.
 PERFORM 1 FROM public.customer_profile WHERE customer_id=c.id FOR UPDATE;
 PERFORM 1 FROM public.customer_address WHERE customer_id=c.id ORDER BY id FOR UPDATE;
 IF public.customer_profile_snapshot()->>'revision' IS DISTINCT FROM p_revision THEN
  RAISE EXCEPTION 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu' USING ERRCODE='PT409'; END IF;
 IF name_value IS NULL OR length(name_value) NOT BETWEEN 2 AND 150
 OR (email_value IS NOT NULL AND (length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) THEN
  RAISE EXCEPTION 'Họ tên hoặc email không hợp lệ' USING ERRCODE='22023'; END IF;
 IF p_addresses IS NULL OR jsonb_typeof(p_addresses)<>'array' THEN
  RAISE EXCEPTION 'Sổ địa chỉ không hợp lệ' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(p_addresses)>20 THEN RAISE EXCEPTION 'Chỉ lưu tối đa 20 địa chỉ'; END IF;
 IF jsonb_array_length(p_addresses)>0 AND (SELECT count(*) FROM jsonb_array_elements(p_addresses) x WHERE x->'is_default'='true'::jsonb)<>1 THEN
  RAISE EXCEPTION 'Cần chọn đúng một địa chỉ mặc định'; END IF;
 SELECT phone_number INTO phone FROM public.customer_phone WHERE customer_id=c.id ORDER BY is_primary DESC,id LIMIT 1;
 UPDATE public.customer SET contact_email=email_value,updated_at=now() WHERE id=c.id;
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(c.id,name_value)
 ON CONFLICT(customer_id) DO UPDATE SET full_name=EXCLUDED.full_name,updated_at=now();
 UPDATE public.customer_address SET is_default=false WHERE customer_id=c.id AND is_default;
 FOR a IN SELECT * FROM jsonb_array_elements(p_addresses) LOOP
  IF jsonb_typeof(a)<>'object' OR jsonb_typeof(a->'is_default') IS DISTINCT FROM 'boolean' THEN
   RAISE EXCEPTION 'Địa chỉ không hợp lệ'; END IF;
  aid:=nullif(a->>'id','')::uuid;
  IF aid IS NOT NULL THEN
   IF aid=ANY(kept) THEN RAISE EXCEPTION 'Địa chỉ bị trùng'; END IF;
   SELECT * INTO old FROM public.customer_address WHERE id=aid AND customer_id=c.id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Địa chỉ không thuộc tài khoản' USING ERRCODE='42501'; END IF;
  END IF;
  street:=btrim(coalesce(a->>'street_address','')); district:=btrim(coalesce(a->>'district',''));
  province_value:=btrim(coalesce(a->>'province','')); ward:=btrim(coalesce(a->>'ward',''));
  -- Cho phép giữ nguyên địa chỉ nhập từ hệ thống cũ chưa đủ quận/huyện.
  IF aid IS NULL OR concat_ws(', ',nullif(street,''),nullif(ward,''),nullif(district,'')) IS DISTINCT FROM old.street_address OR province_value IS DISTINCT FROM coalesce(old.province,'') THEN
   IF length(street) NOT BETWEEN 1 AND 1000 OR length(district) NOT BETWEEN 1 AND 100 OR length(province_value) NOT BETWEEN 1 AND 100 OR length(ward)>100 THEN
    RAISE EXCEPTION 'Vui lòng nhập đầy đủ số nhà, quận/huyện và tỉnh/thành phố'; END IF;
  END IF;
  address_key:=lower(concat_ws('|',street,ward,district,province_value));
  IF address_key=ANY(address_keys) THEN RAISE EXCEPTION 'Địa chỉ bị trùng'; END IF;
  address_keys:=array_append(address_keys,address_key);
  street:=concat_ws(', ',nullif(street,''),nullif(ward,''),nullif(district,''));
  IF aid IS NULL THEN
   INSERT INTO public.customer_address(customer_id,receiver_name,receiver_phone,street_address,province,is_default)
   VALUES(c.id,name_value,phone,street,province_value,(a->>'is_default')::boolean) RETURNING id INTO aid;
  ELSE
   UPDATE public.customer_address SET street_address=street,province=province_value,is_default=(a->>'is_default')::boolean,updated_at=now()
   WHERE id=aid AND customer_id=c.id;
  END IF;
  kept:=array_append(kept,aid);
 END LOOP;
 DELETE FROM public.customer_address WHERE customer_id=c.id AND NOT(id=ANY(kept));
 RETURN public.customer_profile_snapshot();
END $$;
REVOKE ALL ON FUNCTION public.customer_profile_snapshot(),public.customer_profile_save(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_profile_snapshot(),public.customer_profile_save(text,text,jsonb,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
