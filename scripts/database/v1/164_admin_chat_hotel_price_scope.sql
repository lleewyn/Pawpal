BEGIN;SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='1s';
DO $migration$
DECLARE target regprocedure;definition text;old text;new text;
BEGIN
 FOREACH target IN ARRAY ARRAY['public.run_admin_chat_detail(uuid,text,jsonb,integer)'::regprocedure,'public.admin_copilot_extended_facts(text,jsonb)'::regprocedure,'public.run_admin_chat_page(uuid,text,jsonb,integer)'::regprocedure] LOOP
  definition:=pg_get_functiondef(target);
  old:=$old$'price',p.daily_price)$old$;new:=$new$'price',p.daily_price,'billing_minutes',p.billing_minutes)$new$;
  IF strpos(definition,new)=0 THEN
   IF (length(definition)-length(replace(definition,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'unexpected_hotel_unit_projection';END IF;
   definition:=replace(definition,old,new);
  END IF;
  old:=$old$FROM public.hotel_room_type p WHERE p.status='active'$old$;
  new:=old||CASE WHEN target='public.run_admin_chat_detail(uuid,text,jsonb,integer)'::regprocedure THEN ' AND p.service_id=$1' ELSE ' AND p.service_id=s.id' END;
  IF strpos(definition,new)=0 THEN
   IF (length(definition)-length(replace(definition,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'unexpected_hotel_price_scope';END IF;
   definition:=replace(definition,old,new);
  END IF;
  EXECUTE definition;
 END LOOP;
END $migration$;
NOTIFY pgrst,'reload schema';COMMIT;
