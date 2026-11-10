BEGIN;
-- Use the persisted booking creation time so reloading cannot renew the demo link.
DO $$ DECLARE src text;marker text:=$old$'start_at',a.scheduled_start_at$old$;BEGIN
 src:=pg_get_functiondef('public.guest_booking_receipt(text,uuid)'::regprocedure);
 IF position($check$'created_at',a.created_at$check$ IN src)=0 THEN
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected guest receipt definition';END IF;
  EXECUTE replace(src,marker,$new$'created_at',a.created_at,'start_at',a.scheduled_start_at$new$);
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
