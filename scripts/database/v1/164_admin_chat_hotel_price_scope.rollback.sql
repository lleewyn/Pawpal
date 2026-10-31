BEGIN;SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='1s';
DO $migration$
DECLARE target regprocedure;definition text;old text;new text;
BEGIN
 FOREACH target IN ARRAY ARRAY['public.run_admin_chat_detail(uuid,text,jsonb,integer)'::regprocedure,'public.admin_copilot_extended_facts(text,jsonb)'::regprocedure,'public.run_admin_chat_page(uuid,text,jsonb,integer)'::regprocedure] LOOP
  definition:=pg_get_functiondef(target);new:=$new$FROM public.hotel_room_type p WHERE p.status='active'$new$;
  old:=new||CASE WHEN target='public.run_admin_chat_detail(uuid,text,jsonb,integer)'::regprocedure THEN ' AND p.service_id=$1' ELSE ' AND p.service_id=s.id' END;
  IF strpos(definition,old)=0 THEN RAISE EXCEPTION 'unexpected_hotel_scope_rollback';END IF;
  definition:=replace(definition,old,new);
  IF target='public.run_admin_chat_page(uuid,text,jsonb,integer)'::regprocedure THEN definition:=replace(definition,$old$'price',p.daily_price,'billing_minutes',p.billing_minutes)$old$,$new$'price',p.daily_price)$new$);END IF;
  EXECUTE definition;
 END LOOP;
END $migration$;
NOTIFY pgrst,'reload schema';COMMIT;
