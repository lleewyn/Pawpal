BEGIN;
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS booking_contact_phone text
 CHECK(booking_contact_phone IS NULL OR booking_contact_phone ~ '^[+]?[0-9]{8,15}$');
COMMENT ON COLUMN public.appointment.booking_contact_phone IS 'Số liên hệ riêng của lịch hẹn; không thay đổi số đăng nhập hoặc chủ sở hữu.';
DO $$ DECLARE src text;marker text;BEGIN
 src:=pg_get_functiondef('pawpal_private.customer_new_booking_quote(jsonb)'::regprocedure);
 IF position('invalid_booking_contact_phone' IN src)=0 THEN
  marker:=' starts:=(p_details->>''scheduled_start_at'')::timestamptz;';
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected booking quote definition';END IF;
  src:=replace(src,marker,$patch$
 IF p_details ? 'contact_phone' AND (jsonb_typeof(p_details->'contact_phone') IS DISTINCT FROM 'string' OR btrim(p_details->>'contact_phone') !~ '^[+]?[0-9]{8,15}$') THEN RAISE EXCEPTION 'invalid_booking_contact_phone' USING ERRCODE='22023';END IF;
 starts:=(p_details->>'scheduled_start_at')::timestamptz;$patch$);
  EXECUTE src;
 END IF;
 src:=pg_get_functiondef('public.create_own_service_booking(uuid,text,jsonb)'::regprocedure);
 IF position('booking_contact_phone' IN src)=0 THEN
  marker:='UPDATE public.appointment SET scheduled_end_at=(quote->>''end_at'')::timestamptz WHERE id=p_id;';
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected booking create definition';END IF;
  src:=replace(src,marker,$patch$UPDATE public.appointment SET scheduled_end_at=(quote->>'end_at')::timestamptz,
   booking_contact_phone=coalesce(nullif(btrim(p_details->>'contact_phone'),''),nullif(public.customer_profile_snapshot()->>'phone','')) WHERE id=p_id;$patch$);
  EXECUTE src;
 END IF;
 src:=pg_get_functiondef('public.own_service_booking_summary()'::regprocedure);
 IF position('contact_phone' IN src)=0 THEN
  marker:=$old$'id',a.id,'total',t.total_price,$old$;
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected booking summary definition';END IF;
  src:=replace(src,marker,$new$'id',a.id,'total',t.total_price,'contact_phone',a.booking_contact_phone,$new$);EXECUTE src;
 END IF;
 src:=pg_get_functiondef('public.get_admin_service_booking_page(jsonb,integer,boolean)'::regprocedure);
 IF position('a.booking_contact_phone' IN src)=0 THEN
  marker:=$old$coalesce(phone.phone_number,'—') phone$old$;
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected Admin booking phone definition';END IF;
  src:=replace(src,marker,$new$coalesce(a.booking_contact_phone,phone.phone_number,'—') phone$new$);EXECUTE src;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
