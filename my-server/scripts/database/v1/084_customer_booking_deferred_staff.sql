BEGIN;
-- Pending customer requests may be accepted before staff shifts are assigned.
-- Keep operating hours, room conflicts, capacity and explicit staff validation.
DO $$
DECLARE src text; old_clause text := $old$'available',CASE WHEN kind='grooming_spa' THEN jsonb_array_length(workers)>0 ELSE true END,'reason',CASE WHEN kind='grooming_spa' AND jsonb_array_length(workers)=0 THEN 'no_scheduled_staff' ELSE NULL END$old$;
BEGIN
 src:=pg_get_functiondef('public.own_booking_availability(jsonb)'::regprocedure);
 IF position(old_clause IN src)>0 THEN
  EXECUTE replace(src,old_clause,$new$'available',true,'reason',NULL$new$);
 ELSIF position($check$'available',true,'reason',NULL$check$ IN src)=0 THEN
  RAISE EXCEPTION 'Unexpected availability function definition';
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
