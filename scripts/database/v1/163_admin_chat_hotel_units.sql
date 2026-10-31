BEGIN;SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='1s';
DO $migration$
DECLARE target regprocedure;definition text;old text:=$old$'price',p.daily_price)$old$;new text:=$new$'price',p.daily_price,'billing_minutes',p.billing_minutes)$new$;
BEGIN
 FOREACH target IN ARRAY ARRAY['public.run_admin_chat_detail(uuid,text,jsonb,integer)'::regprocedure,'public.admin_copilot_extended_facts(text,jsonb)'::regprocedure] LOOP
  definition:=pg_get_functiondef(target);
  IF strpos(definition,new)>0 THEN CONTINUE;END IF;
  IF (length(definition)-length(replace(definition,old,'')))/length(old)<>1 THEN RAISE EXCEPTION 'unexpected_admin_hotel_projection';END IF;
  EXECUTE replace(definition,old,new);
 END LOOP;
END $migration$;
NOTIFY pgrst,'reload schema';COMMIT;
