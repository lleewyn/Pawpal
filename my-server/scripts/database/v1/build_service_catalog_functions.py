"""Build an explicit, reviewable migration from the inspected cloud definitions."""
import os,pathlib,re
folder=pathlib.Path(os.environ['TEMP'])/'pawpal-service-import-tools'
names=['pawpal_private.create_customer_logistics_core','pawpal_private.create_customer_service_core',
 'pawpal_private.customer_booking_move_quote','pawpal_private.customer_new_booking_quote',
 'public.change_admin_service_charge','public.create_admin_logistics_booking','public.create_admin_service_booking','public.save_admin_service_catalog']
out=[]
for name in names:
 s=(folder/(name+'.sql')).read_text(encoding='utf-8')
 if name.endswith('save_admin_service_catalog'):
  s=s.replace("INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)", "UPDATE public.service SET benefits=coalesce(p_details->>'benefits',benefits),amenities=coalesce(p_details->>'amenities',amenities),package_name=coalesce(p_details->>'package_name',package_name) WHERE id=p_id;\n IF p_details ? 'variant_updates' THEN PERFORM pawpal_private.save_catalog_variant_values(p_id,p_details->'variant_updates'); END IF;\n INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)")
  s=s.replace("(price->>'weight_from')::numeric IS DISTINCT FROM previous_to", "((price->>'weight_from')::numeric < previous_to OR (price->>'weight_from')::numeric < 0)")
  s=s.replace("OR (sequence=price_count AND price->>'weight_to' IS NOT NULL)","OR ((price->>'weight_to')::numeric <= (price->>'weight_from')::numeric)")
  s=s.replace("previous_to:=(price->>'weight_to')::numeric;", "previous_to:=coalesce((price->>'weight_to')::numeric,1e100);")
  # Preserve per-variant duration when an administrator revises only prices.
  s=s.replace('service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status)', 'service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status,duration_minutes)')
  s=s.replace("(price->>'unit_price')::numeric,now_at,'active');", "(price->>'unit_price')::numeric,now_at,'active',coalesce((SELECT duration_minutes FROM public.service_price_matrix WHERE service_id=p_id AND weight_from=(price->>'weight_from')::numeric ORDER BY effective_from DESC LIMIT 1),duration_value));")
 else:
  s=s.replace('(weight_to IS NULL OR weight_value<weight_to)', '(weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to))')
  for var in ['distance_value','trip.distance_km']:
   s=s.replace(f'(distance_to IS NULL OR {var}<distance_to)',f'(distance_to IS NULL OR {var}<distance_to OR (distance_to_inclusive AND {var}=distance_to))')
  # Every tariff now belongs to a specific service; round-trip prices cover both legs.
  s=re.sub(r'(FROM public\.taxi_price_rule\s+WHERE )status=',r'\1service_id=svc.id AND status=',s)
  s=s.replace("IF trip_type_value='round_trip' THEN", "IF trip_type_value='round_trip' AND svc.trip_type IS NULL THEN")
  s=s.replace("IF p_details->>'trip_type'='round_trip' THEN", "IF p_details->>'trip_type'='round_trip' AND svc.trip_type IS NULL THEN")
  s=s.replace("IF trip.trip_type='round_trip' THEN", "IF trip.trip_type='round_trip' AND svc.trip_type IS NULL THEN")
  if 'trip_type_value text' in s:
   marker="IF category NOT IN ('pet_hotel','pet_taxi')"
   pos=s.index(marker)
   s=s[:pos]+"IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM trip_type_value THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;\n "+s[pos:]
  if name.endswith('customer_new_booking_quote'):
   s=s.replace("ELSIF kind='pet_taxi' THEN", "ELSIF kind='pet_taxi' THEN\n  IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM p_details->>'trip_type' THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;")
  if name.endswith('customer_booking_move_quote'):
   s=s.replace("ELSIF kind='pet_taxi' AND line.is_primary THEN", "ELSIF kind='pet_taxi' AND line.is_primary THEN\n    IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM trip.trip_type THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;")
  at='a.scheduled_start_at' if name.endswith('change_admin_service_charge') else 'p_start' if name.endswith('customer_booking_move_quote') else 'starts'
  pet='a.pet_id' if name.endswith(('change_admin_service_charge','customer_booking_move_quote')) else 'pet.id'
  s=s.replace('svc.estimated_duration',f'pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id={pet}),{at})')
  # Hotel type must match the selected service and its weight/date conditions.
  s=s.replace("WHERE id=room.room_type_id AND status='active' FOR SHARE", "WHERE id=room.room_type_id AND service_id=svc.id AND status='active'\n   AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts)\n   AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)>=weight_from\n   AND (weight_to IS NULL OR (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)<weight_to OR (weight_to_inclusive AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)=weight_to)) FOR SHARE") if not name.endswith('customer_booking_move_quote') else s
  s=s.replace('unit_value:=room_type.daily_price;quoted:=unit_value*quantity_value;', 'quantity_value:=ceil(extract(epoch FROM (ends-starts))/(room_type.billing_minutes*60))::integer;unit_value:=room_type.daily_price;quoted:=unit_value*quantity_value;')
  s=s.replace('qty:=ceil(extract(epoch FROM (ends-starts))/86400)::integer;', 'qty:=ceil(extract(epoch FROM (ends-starts))/(room_type.billing_minutes*60))::integer;')
  s=s.replace('qty:=ceil(extract(epoch FROM (ends-p_start))/86400)::integer;', "qty:=ceil(extract(epoch FROM (ends-p_start))/((SELECT billing_minutes*60 FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active')))::integer;")
  if name.endswith('customer_booking_move_quote'):
   s=s.replace('unit_value:=room_rate;', "SELECT daily_price INTO room_rate FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active' AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)); IF room_rate IS NULL THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='22023'; END IF;unit_value:=room_rate;")
 out.append(s.rstrip().rstrip(';')+';')
pathlib.Path(__file__).with_name('097_service_catalog_functions.sql').write_text('-- Explicit updates to the inspected booking and catalog functions.\n'+'\n\n'.join(out)+'\n',encoding='utf-8')
