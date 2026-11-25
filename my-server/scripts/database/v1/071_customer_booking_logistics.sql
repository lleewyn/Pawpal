BEGIN;
CREATE OR REPLACE FUNCTION public.own_service_booking_logistics(p_booking uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; hotel jsonb; taxi jsonb; workers jsonb;
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_booking;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(a.customer_id)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(x) INTO hotel FROM (
  SELECT h.booking_code,r.room_number,t.room_type,h.check_in_at,h.check_out_at,h.status,h.special_diet_notes,h.care_notes,h.daily_price
  FROM public.hotel_booking h JOIN public.hotel_room r ON r.id=h.room_id JOIN public.hotel_room_type t ON t.id=r.room_type_id
  WHERE h.appointment_id=a.id
 ) x;
 SELECT to_jsonb(x) INTO taxi FROM (
  SELECT tr.pickup_address,tr.dropoff_address,tr.distance_km,tr.trip_type,tr.outbound_at,tr.return_at,tr.quoted_amount,tr.status,s.full_name AS driver_name
  FROM public.taxi_trip tr LEFT JOIN public.staff s ON s.id=tr.driver_staff_id WHERE tr.appointment_id=a.id
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.item_id),'[]'::jsonb) INTO workers FROM (
  SELECT i.id AS item_id,s.full_name AS staff_name FROM public.appointment_item i JOIN public.staff s ON s.id=i.staff_id WHERE i.appointment_id=a.id
 ) x;
 RETURN jsonb_build_object('staff_name',(SELECT full_name FROM public.staff WHERE id=a.staff_id),'item_staff',workers,'hotel',hotel,'taxi',taxi);
END $$;
REVOKE ALL ON FUNCTION public.own_service_booking_logistics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_service_booking_logistics(uuid) TO authenticated;
DROP POLICY IF EXISTS own_customer_hotel_booking ON public.hotel_booking;
CREATE POLICY own_customer_hotel_booking ON public.hotel_booking FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.appointment a WHERE a.id=appointment_id AND pawpal_private.owns_customer(a.customer_id)));
DROP POLICY IF EXISTS own_customer_taxi_trip ON public.taxi_trip;
CREATE POLICY own_customer_taxi_trip ON public.taxi_trip FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.appointment a WHERE a.id=appointment_id AND pawpal_private.owns_customer(a.customer_id)));
GRANT SELECT ON public.hotel_booking,public.taxi_trip TO authenticated;
DO $$ DECLARE tbl text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH tbl IN ARRAY ARRAY['hotel_booking','taxi_trip'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=tbl) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',tbl);
   END IF;
  END LOOP;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
