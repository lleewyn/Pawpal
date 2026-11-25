-- Add only booked-room context to the existing scoped hotel-stay projection.
BEGIN;
DO $$ DECLARE source text;
 needle text:='h.check_in_at,h.check_out_at,h.status,h.special_diet_notes,h.care_notes,h.updated_at';
 replacement text:='h.check_in_at,h.check_out_at,h.status,h.special_diet_notes,h.care_notes,h.updated_at,h.daily_price,(SELECT room_number FROM public.hotel_room WHERE id=h.room_id) room_number,(SELECT t.room_type FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.id=h.room_id) room_type,(SELECT staff_id FROM public.appointment WHERE id=h.appointment_id) lead_staff_id';
BEGIN
 SELECT pg_get_functiondef(to_regprocedure('public.get_staff_workspace(text,text,uuid,integer)')) INTO source;
 IF source IS NULL OR strpos(source,needle)=0 OR strpos(source,'lead_staff_id')>0 THEN RAISE EXCEPTION 'unexpected_hotel_projection_definition'; END IF;
 EXECUTE replace(source,needle,replacement);
END $$;
COMMIT;
