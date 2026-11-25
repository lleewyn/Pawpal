BEGIN;
DROP FUNCTION public.read_staff_copilot_booking(text,jsonb,integer);
CREATE OR REPLACE FUNCTION pawpal_private.staff_copilot_refs_allowed(p_actor uuid,p_codes jsonb,p_refs jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ref jsonb; target uuid; kind text; permission text; owns boolean;
BEGIN
 IF p_refs IS NULL OR jsonb_typeof(p_refs)<>'array' OR jsonb_array_length(p_refs)>64 OR octet_length(p_refs::text)>16384 THEN RETURN false; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(p_refs) LOOP
  IF jsonb_typeof(ref)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(ref) k WHERE k NOT IN ('kind','id','permission')) THEN RETURN false; END IF;
  kind:=ref->>'kind';permission:=ref->>'permission';
  IF kind IS NULL OR permission IS NULL OR NOT p_codes?permission OR permission NOT IN ('work.copilot.use','work.customer.read','work.pet.read','work.sales.create','work.cashier.collect','work.stock.read','work.service.perform','work.chat.handle','work.complaint.handle','work.self.read') THEN RETURN false; END IF;
  IF kind='permission' THEN
   IF ref?'id' THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  IF coalesce(ref->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
  target:=(ref->>'id')::uuid;
  CASE kind
  WHEN 'customer' THEN owns:=permission='work.customer.read' AND EXISTS(SELECT 1 FROM public.customer WHERE id=target);
  WHEN 'pet' THEN owns:=permission='work.pet.read' AND EXISTS(SELECT 1 FROM public.pet_profile WHERE id=target);
  WHEN 'order' THEN owns:=permission IN ('work.sales.create','work.cashier.collect') AND EXISTS(SELECT 1 FROM public.sales_order WHERE id=target);
  WHEN 'product' THEN owns:=permission='work.stock.read' AND EXISTS(SELECT 1 FROM public.product_variant WHERE id=target);
  WHEN 'service' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.service WHERE id=target);
  WHEN 'staff' THEN owns:=permission='work.self.read' AND target=p_actor;
  WHEN 'schedule' THEN owns:=permission='work.self.read' AND EXISTS(SELECT 1 FROM public.staff_schedule WHERE id=target AND staff_id=p_actor);
  WHEN 'conversation' THEN owns:=permission='work.chat.handle' AND EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id=p_actor);
  WHEN 'queue' THEN owns:=permission='work.chat.handle' AND EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id IS NULL AND status='waiting_agent');
  WHEN 'ticket' THEN owns:=permission='work.complaint.handle' AND EXISTS(SELECT 1 FROM public.support_ticket WHERE id=target AND assigned_staff_id=p_actor);
  WHEN 'taxi' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.taxi_trip WHERE id=target AND driver_staff_id=p_actor);
  WHEN 'appointment' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=target AND (a.staff_id=p_actor OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_actor) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_actor)));
  WHEN 'hotel' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.hotel_booking h JOIN public.appointment a ON a.id=h.appointment_id WHERE h.id=target AND (a.staff_id=p_actor OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_actor) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_actor)));
  WHEN 'knowledge' THEN owns:=permission='work.copilot.use' AND EXISTS(SELECT 1 FROM public.chatbot_knowledge_faq WHERE id=target AND is_active);
  WHEN 'offer' THEN owns:=permission='work.sales.create' AND EXISTS(SELECT 1 FROM public.voucher WHERE id=target AND is_active AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date);
  ELSE RETURN false;
  END CASE;
  IF owns IS DISTINCT FROM true THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_copilot_refs_allowed(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
