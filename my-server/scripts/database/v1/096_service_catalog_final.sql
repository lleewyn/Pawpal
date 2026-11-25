-- Configuration required by Dich_vu_data_final.csv. Existing booking snapshots stay intact.
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS package_name text;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS duration_label text;
ALTER TABLE public.service ADD COLUMN IF NOT EXISTS trip_type text CHECK (trip_type IN ('one_way','round_trip'));
ALTER TABLE public.service_price_matrix ADD COLUMN IF NOT EXISTS variant_code text;
ALTER TABLE public.service_price_matrix ADD COLUMN IF NOT EXISTS variant_condition text;
ALTER TABLE public.service_price_matrix ADD COLUMN IF NOT EXISTS duration_minutes integer CHECK (duration_minutes>0);
ALTER TABLE public.service_price_matrix ADD COLUMN IF NOT EXISTS weight_to_inclusive boolean NOT NULL DEFAULT false;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.service(id);
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS variant_code text;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS variant_condition text;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS weight_from numeric NOT NULL DEFAULT 0;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS weight_to numeric;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS weight_to_inclusive boolean NOT NULL DEFAULT false;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS billing_minutes integer NOT NULL DEFAULT 1440 CHECK (billing_minutes>0);
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS effective_from timestamptz;
ALTER TABLE public.hotel_room_type ADD COLUMN IF NOT EXISTS effective_to timestamptz;
ALTER TABLE public.taxi_price_rule ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.service(id);
ALTER TABLE public.taxi_price_rule ADD COLUMN IF NOT EXISTS variant_code text;
ALTER TABLE public.taxi_price_rule ADD COLUMN IF NOT EXISTS variant_condition text;
ALTER TABLE public.taxi_price_rule ADD COLUMN IF NOT EXISTS weight_to_inclusive boolean NOT NULL DEFAULT false;
ALTER TABLE public.taxi_price_rule ADD COLUMN IF NOT EXISTS distance_to_inclusive boolean NOT NULL DEFAULT false;
ALTER TABLE public.taxi_price_rule DROP CONSTRAINT IF EXISTS taxi_price_no_overlap;
ALTER TABLE public.taxi_price_rule ADD CONSTRAINT taxi_price_no_overlap EXCLUDE USING gist
 (service_id WITH =, numrange(distance_from,distance_to,'[)') WITH &&,
 numrange(weight_from,weight_to,'[)') WITH &&,tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE (status='active');

CREATE OR REPLACE FUNCTION pawpal_private.catalog_duration(p_service uuid,p_weight numeric,p_at timestamptz)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT p.duration_minutes FROM public.service_price_matrix p
 WHERE p.service_id=s.id AND p.status='active' AND p.effective_from<=p_at AND (p.effective_to IS NULL OR p.effective_to>p_at)
 AND p_weight>=p.weight_from AND (p.weight_to IS NULL OR p_weight<p.weight_to OR (p.weight_to_inclusive AND p_weight=p.weight_to))
 ORDER BY p.effective_from DESC LIMIT 1),s.estimated_duration) FROM public.service s WHERE s.id=p_service
$$;
REVOKE ALL ON FUNCTION pawpal_private.catalog_duration(uuid,numeric,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION pawpal_private.catalog_duration(uuid,numeric,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.save_catalog_variant_values(p_service uuid,p_updates jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE kind text; v jsonb; amount numeric; mins integer; changed integer; now_at timestamptz:=clock_timestamp();
 p public.service_price_matrix; t public.taxi_price_rule;
BEGIN
 SELECT c.category_code INTO kind FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.id=p_service;
 IF jsonb_typeof(p_updates)<>'array' OR jsonb_array_length(p_updates)>100 THEN RAISE EXCEPTION 'invalid_service_variants' USING ERRCODE='22023'; END IF;
 IF NOT pawpal_private.has_permission(CASE kind WHEN 'grooming_spa' THEN 'service_price_matrix.write' WHEN 'pet_hotel' THEN 'hotel_room_type.write' ELSE 'taxi_price_rule.write' END) THEN RAISE EXCEPTION 'service_price_forbidden' USING ERRCODE='42501'; END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
  amount:=(v->>'unit_price')::numeric;mins:=nullif(v->>'duration_minutes','')::integer;
  IF amount IS NULL OR amount<0 OR amount<>trunc(amount) OR amount::text IN ('NaN','Infinity','-Infinity') OR (kind='grooming_spa' AND (mins IS NULL OR mins NOT BETWEEN 1 AND 10080)) THEN RAISE EXCEPTION 'invalid_service_prices' USING ERRCODE='22023'; END IF;
  IF kind='grooming_spa' THEN
   SELECT * INTO p FROM public.service_price_matrix WHERE id=(v->>'id')::uuid AND service_id=p_service AND status='active' AND updated_at=(v->>'updated_at')::timestamptz AND effective_from<now_at AND (effective_to IS NULL OR effective_to>now_at) FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'service_catalog_changed' USING ERRCODE='PT409'; END IF;
   IF p.unit_price=amount AND p.duration_minutes=mins THEN CONTINUE; END IF;
   UPDATE public.service_price_matrix SET effective_to=now_at WHERE id=p.id;
   INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,effective_to,status,variant_code,variant_condition,duration_minutes,weight_to_inclusive)
   VALUES(p_service,p.weight_from,p.weight_to,amount,now_at,p.effective_to,'active',p.variant_code,p.variant_condition,mins,p.weight_to_inclusive);
  ELSIF kind='pet_taxi' THEN
   SELECT * INTO t FROM public.taxi_price_rule WHERE id=(v->>'id')::uuid AND service_id=p_service AND status='active' AND updated_at=(v->>'updated_at')::timestamptz AND effective_from<now_at AND (effective_to IS NULL OR effective_to>now_at) FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'service_catalog_changed' USING ERRCODE='PT409'; END IF;
   IF t.base_price+t.surcharge=amount THEN CONTINUE; END IF;
   UPDATE public.taxi_price_rule SET effective_to=now_at WHERE id=t.id;
   INSERT INTO public.taxi_price_rule(service_id,distance_from,distance_to,weight_from,weight_to,base_price,surcharge,effective_from,effective_to,status,variant_code,variant_condition,weight_to_inclusive,distance_to_inclusive)
   VALUES(p_service,t.distance_from,t.distance_to,t.weight_from,t.weight_to,amount,0,now_at,t.effective_to,'active',t.variant_code,t.variant_condition,t.weight_to_inclusive,t.distance_to_inclusive);
  ELSE
   UPDATE public.hotel_room_type SET daily_price=amount WHERE id=(v->>'id')::uuid AND service_id=p_service AND status='active' AND updated_at=(v->>'updated_at')::timestamptz;
   GET DIAGNOSTICS changed=ROW_COUNT;
   IF changed<>1 THEN RAISE EXCEPTION 'service_catalog_changed' USING ERRCODE='PT409'; END IF;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.save_catalog_variant_values(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION pawpal_private.save_catalog_variant_values(uuid,jsonb) TO authenticated;

DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['service','service_price_matrix','service_image','service_care_action','service_supported_species','hotel_room_type','hotel_room','taxi_price_rule'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END $$;
