-- DELETE WAL cannot enforce row RLS. Replace published DELETEs with owner-scoped invalidation.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.realtime_signal_backup(name text PRIMARY KEY,value jsonb NOT NULL);
INSERT INTO pawpal_private.realtime_signal_backup SELECT 'publication',to_jsonb(p) FROM pg_publication p WHERE pubname='supabase_realtime';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND pubinsert AND pubupdate) THEN RAISE EXCEPTION 'realtime_publication_insert_update_required'; END IF;
END $$;
REVOKE ALL ON pawpal_private.realtime_signal_backup FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE public.workspace_signal (
 auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 revision uuid NOT NULL DEFAULT extensions.gen_random_uuid(),
 domain text NOT NULL CHECK(domain IN ('access','chat','service','support','customer','sales','catalog','notification','copilot','refresh')),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.workspace_signal ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_signal FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.workspace_signal TO authenticated;
-- Only an opaque own-identity signal, including a final signal after suspension; never business rows.
CREATE POLICY own_workspace_signal ON public.workspace_signal FOR SELECT TO authenticated USING(auth_user_id=auth.uid());
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND puballtables)
 THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_signal; END IF;
END $$;
ALTER PUBLICATION supabase_realtime SET(publish='insert,update');
CREATE FUNCTION public.get_workspace_signal_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'signal_identity_required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('auth_user_id',auth.uid(),'enabled',true);
END $$;
REVOKE ALL ON FUNCTION public.get_workspace_signal_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_signal_context() TO authenticated;
DO $$ DECLARE signature text; source text; needle text; BEGIN
 FOREACH signature IN ARRAY ARRAY['public.get_staff_login_context()','public.own_notifications_snapshot()','public.own_notifications_snapshot(integer,integer,boolean)'] LOOP
  SELECT pg_get_functiondef(to_regprocedure(signature)) INTO source;
  needle:=CASE WHEN signature='public.get_staff_login_context()' THEN 'jsonb_build_object(''is_staff'',true' ELSE 'jsonb_build_object(''customer_id'',cid' END;
  IF source IS NULL OR strpos(source,needle)=0 OR strpos(source,'''workspace_signals''')>0 THEN RAISE EXCEPTION 'unexpected_signal_capability_definition'; END IF;
  INSERT INTO pawpal_private.realtime_signal_backup VALUES(signature,jsonb_build_object('definition',source));
  EXECUTE replace(source,needle,replace(needle,'jsonb_build_object(','jsonb_build_object(''workspace_signals'',true,'));
 END LOOP;
END $$;

CREATE FUNCTION pawpal_private.emit_workspace_signal(p_users uuid[],p_domain text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.workspace_signal(auth_user_id,domain,updated_at)
 SELECT DISTINCT u.id,p_domain,transaction_timestamp() FROM auth.users u WHERE u.id=ANY(p_users) ORDER BY u.id
 ON CONFLICT(auth_user_id) DO UPDATE SET revision=extensions.gen_random_uuid(),domain=EXCLUDED.domain,updated_at=EXCLUDED.updated_at
 WHERE workspace_signal.updated_at IS DISTINCT FROM EXCLUDED.updated_at;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.emit_workspace_signal(uuid[],text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION pawpal_private.signal_workspace_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE before_row jsonb:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 after_row jsonb:=CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
 row_data jsonb; staff_ids uuid[]:='{}';customer_ids uuid[]:='{}';appointment_ids uuid[]:='{}';conversation_ids uuid[]:='{}';users uuid[]:='{}';domain text;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'staff','staff_role','staff_schedule','staff_assessment' THEN domain:='access';
 WHEN 'role_permission' THEN domain:='access';
 WHEN 'users' THEN domain:='access';
 WHEN 'chat_conversation','chat_message' THEN domain:='chat';
 WHEN 'appointment','appointment_item','hotel_booking','taxi_trip' THEN domain:='service';
 WHEN 'support_ticket' THEN domain:='support';
 WHEN 'customer','customer_profile','customer_phone','pet_profile','paw_point_transaction' THEN domain:='customer';
 WHEN 'sales_order','sales_order_detail','payment','refund_transaction' THEN domain:='sales';
 WHEN 'notification' THEN domain:='notification';
 WHEN 'chatbot_knowledge_faq' THEN domain:='copilot';
 WHEN 'staff_copilot_exchange' THEN domain:='copilot';
 WHEN 'product','product_variant','inventory','service','service_price_matrix','taxi_price_rule','hotel_room','hotel_room_type','voucher' THEN domain:='catalog';
 ELSE domain:='refresh';
 END CASE;
 FOR row_data IN SELECT before_row UNION ALL SELECT after_row LOOP
  IF row_data='{}'::jsonb THEN CONTINUE; END IF;
  IF TG_TABLE_SCHEMA='auth' AND TG_TABLE_NAME='users' THEN users:=array_append(users,(row_data->>'id')::uuid); END IF;
  IF TG_TABLE_SCHEMA='pawpal_private' AND TG_TABLE_NAME='staff_copilot_exchange' THEN users:=array_append(users,(row_data->>'auth_user_id')::uuid);CONTINUE; END IF;
  IF TG_TABLE_NAME='staff' THEN staff_ids:=array_append(staff_ids,(row_data->>'id')::uuid);users:=array_append(users,(row_data->>'auth_user_id')::uuid); END IF;
  IF row_data?'staff_id' THEN staff_ids:=array_append(staff_ids,(row_data->>'staff_id')::uuid); END IF;
  IF row_data?'assigned_staff_id' THEN staff_ids:=array_append(staff_ids,(row_data->>'assigned_staff_id')::uuid); END IF;
  IF row_data?'driver_staff_id' THEN staff_ids:=array_append(staff_ids,(row_data->>'driver_staff_id')::uuid); END IF;
  IF TG_TABLE_NAME='customer' THEN customer_ids:=array_append(customer_ids,(row_data->>'id')::uuid);users:=array_append(users,(row_data->>'auth_user_id')::uuid); END IF;
  IF row_data?'customer_id' THEN customer_ids:=array_append(customer_ids,(row_data->>'customer_id')::uuid); END IF;
  IF TG_TABLE_NAME='appointment' THEN appointment_ids:=array_append(appointment_ids,(row_data->>'id')::uuid); END IF;
  IF row_data?'appointment_id' THEN appointment_ids:=array_append(appointment_ids,(row_data->>'appointment_id')::uuid); END IF;
  IF TG_TABLE_NAME='chat_conversation' THEN conversation_ids:=array_append(conversation_ids,(row_data->>'id')::uuid); END IF;
  IF row_data?'conversation_id' THEN conversation_ids:=array_append(conversation_ids,(row_data->>'conversation_id')::uuid); END IF;
  IF row_data?'wishlist_id' THEN SELECT customer_ids||coalesce(array_agg(customer_id),'{}') INTO customer_ids FROM public.wishlist WHERE id=(row_data->>'wishlist_id')::uuid; END IF;
  IF row_data?'care_log_id' THEN SELECT appointment_ids||coalesce(array_agg(appointment_id),'{}') INTO appointment_ids FROM public.care_log WHERE id=(row_data->>'care_log_id')::uuid; END IF;
  IF row_data?'pet_id' THEN SELECT customer_ids||coalesce(array_agg(customer_id),'{}') INTO customer_ids FROM public.pet_profile WHERE id=(row_data->>'pet_id')::uuid; END IF;
  IF row_data?'ticket_id' THEN
   SELECT customer_ids||coalesce(array_agg(customer_id),'{}'),staff_ids||coalesce(array_agg(assigned_staff_id),'{}') INTO customer_ids,staff_ids FROM public.support_ticket WHERE id=(row_data->>'ticket_id')::uuid;
  END IF;
 END LOOP;
 SELECT staff_ids||coalesce(array_agg(staff_id),'{}') INTO staff_ids FROM (
  SELECT staff_id FROM public.appointment WHERE id=ANY(appointment_ids)
  UNION SELECT staff_id FROM public.appointment_item WHERE appointment_id=ANY(appointment_ids)
  UNION SELECT driver_staff_id FROM public.taxi_trip WHERE appointment_id=ANY(appointment_ids)
  UNION SELECT assigned_staff_id FROM public.chat_conversation WHERE id=ANY(conversation_ids)
 )t;
 SELECT customer_ids||coalesce(array_agg(customer_id),'{}') INTO customer_ids FROM (
  SELECT customer_id FROM public.appointment WHERE id=ANY(appointment_ids)
  UNION SELECT customer_id FROM public.chat_conversation WHERE id=ANY(conversation_ids)
 )t;
 -- Shared read catalogs are visible in work projections. The signal contains no affected IDs or text.
 IF TG_TABLE_SCHEMA='public' AND domain IN ('customer','sales','catalog','copilot') OR TG_TABLE_NAME='role_permission' THEN
  SELECT users||coalesce(array_agg(s.auth_user_id),'{}') INTO users FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='STAFF';
 END IF;
 SELECT users||coalesce(array_agg(auth_user_id),'{}') INTO users FROM public.staff WHERE id=ANY(staff_ids);
 SELECT users||coalesce(array_agg(auth_user_id),'{}') INTO users FROM public.customer WHERE id=ANY(customer_ids);
 IF TG_OP='DELETE' AND TG_TABLE_SCHEMA='public' THEN
  SELECT users||coalesce(array_agg(s.auth_user_id),'{}') INTO users FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN';
 END IF;
 PERFORM pawpal_private.emit_workspace_signal(users,domain);
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.signal_workspace_change() FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname<>'workspace_signal' AND
 (c.relname IN ('staff','staff_role','staff_schedule','staff_assessment','role_permission','chat_conversation','chat_message','appointment','appointment_item','hotel_booking','taxi_trip','support_ticket','support_ticket_message','customer','customer_profile','customer_address','customer_phone','customer_membership','customer_voucher','pet_profile','pet_weight_history','care_log','care_log_media','wishlist','wishlist_product','wishlist_service','paw_point_transaction','sales_order','sales_order_detail','payment','refund_transaction','notification','chatbot_knowledge_faq','product','product_variant','inventory','service','service_price_matrix','taxi_price_rule','hotel_room','hotel_room_type','voucher')
 OR EXISTS(SELECT 1 FROM pg_publication_tables p WHERE p.pubname='supabase_realtime' AND p.schemaname='public' AND p.tablename=c.relname)) LOOP
  EXECUTE format('CREATE TRIGGER v183_workspace_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.signal_workspace_change()',t.relname);
 END LOOP;
END $$;
CREATE TRIGGER v183_auth_signal AFTER UPDATE OF banned_until ON auth.users FOR EACH ROW EXECUTE FUNCTION pawpal_private.signal_workspace_change();
CREATE TRIGGER v183_workspace_signal AFTER INSERT OR DELETE ON pawpal_private.staff_copilot_exchange FOR EACH ROW EXECUTE FUNCTION pawpal_private.signal_workspace_change();
NOTIFY pgrst,'reload schema';
COMMIT;
