-- Extend only the assigned-ticket projection; do not grant source table or approval access.
BEGIN;
DO $$ DECLARE source text;
 needle text:='SELECT id,ticket_code,customer_id,subject,status,priority,description,updated_at FROM public.support_ticket WHERE assigned_staff_id=actor';
 replacement text:='SELECT st.id,st.ticket_code,st.customer_id,st.subject,st.status,st.priority,st.description,st.updated_at,st.order_id,st.appointment_id,st.resolution_type,st.resolution_note,st.approved_amount,(SELECT o.order_code FROM public.sales_order o WHERE o.id=st.order_id AND o.customer_id=st.customer_id) linked_order_code,(SELECT a.appointment_code FROM public.appointment a WHERE a.id=st.appointment_id AND a.customer_id=st.customer_id) linked_appointment_code FROM public.support_ticket st WHERE assigned_staff_id=actor';
BEGIN
 SELECT pg_get_functiondef(to_regprocedure('public.get_staff_workspace(text,text,uuid,integer)')) INTO source;
 IF source IS NULL OR strpos(source,needle)=0 OR strpos(source,'linked_order_code')>0 THEN RAISE EXCEPTION 'unexpected_complaint_projection_definition'; END IF;
 EXECUTE replace(source,needle,replacement);
END $$;
COMMIT;
