-- Supabase is the authority for these scopes. Session context UUIDs can precede a draft parent;
-- the committed references below always use actual business foreign keys.
ALTER TABLE public.media_upload_session ADD COLUMN ticket_id uuid,ADD COLUMN support_message_id uuid,ADD COLUMN return_id uuid,ADD COLUMN sales_order_id uuid REFERENCES public.sales_order(id);
ALTER TABLE public.support_ticket_message_attachment ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE public.support_ticket_message_attachment ADD CONSTRAINT ticket_attachment_one_source CHECK((file_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
ALTER TABLE public.return_request_evidence ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.return_request_evidence ADD CONSTRAINT return_evidence_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
REVOKE INSERT,UPDATE,DELETE ON public.support_ticket_message_attachment,public.return_request_evidence FROM anon,authenticated;

CREATE FUNCTION pawpal_private.evidence_customer(p_user uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT c.id FROM public.customer c JOIN auth.users u ON u.id=c.auth_user_id WHERE u.id=p_user AND c.customer_status='active' AND coalesce(u.banned_until<=now(),true) AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_user)
$$;
CREATE FUNCTION pawpal_private.evidence_admin(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=pawpal_private.media_staff(p_user) AND role_code='ADMIN')
$$;
CREATE FUNCTION pawpal_private.evidence_access(p_user uuid,p_purpose text,p_target uuid,p_context uuid,p_write boolean) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.support_ticket;m public.support_ticket_message;owner_id uuid;actor_staff uuid:=pawpal_private.media_staff(p_user);admin boolean:=pawpal_private.evidence_admin(p_user);
BEGIN
 IF p_user IS NULL OR p_target IS NULL OR p_context IS NULL THEN RETURN false; END IF;
 IF p_purpose='ticket_image' THEN
  SELECT * INTO t FROM public.support_ticket WHERE id=p_context;
  IF NOT FOUND THEN RETURN p_write AND (admin OR pawpal_private.evidence_customer(p_user) IS NOT NULL); END IF;
  SELECT * INTO m FROM public.support_ticket_message WHERE id=p_target;
  IF FOUND AND (m.ticket_id<>t.id OR (p_write AND m.sender_account_id IS DISTINCT FROM p_user)) THEN RETURN false; END IF;
  IF p_write AND t.status IN ('closed','resolved','completed','rejected') THEN RETURN false; END IF;
  IF admin OR (actor_staff IS NOT NULL AND t.assigned_staff_id=actor_staff AND EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=actor_staff AND rp.permission_code='work.complaint.handle')) THEN RETURN true; END IF;
  RETURN pawpal_private.evidence_customer(p_user)=t.customer_id AND NOT coalesce(m.is_internal,false);
 ELSIF p_purpose='return_image' THEN
  SELECT customer_id INTO owner_id FROM public.sales_order WHERE id=p_context AND (NOT p_write OR order_status IN ('completed','delivered','returned'));
  IF NOT FOUND OR EXISTS(SELECT 1 FROM public.return_request WHERE id=p_target AND (sales_order_id<>p_context OR (p_write AND request_status<>'pending'))) THEN RETURN false; END IF;
  RETURN admin OR pawpal_private.evidence_customer(p_user)=owner_id;
 END IF;
 RETURN false;
END $$;
CREATE FUNCTION pawpal_private.media_session_manage(p_user uuid,p_session uuid,p_write boolean DEFAULT true) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session;
 IF NOT FOUND THEN RETURN false; END IF;
 IF s.purpose IN ('ticket_image','return_image') THEN RETURN coalesce(pawpal_private.evidence_access(p_user,s.purpose,coalesce(s.support_message_id,s.return_id),coalesce(s.ticket_id,s.sales_order_id),p_write),false); END IF;
 RETURN pawpal_private.media_manage(p_user,s.purpose,s.product_id,s.appointment_id);
END $$;
CREATE FUNCTION pawpal_private.attach_private_evidence(p_purpose text,p_target uuid,p_ids jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE context_id uuid;item jsonb;selected uuid;seen uuid[]:='{}';a public.media_asset;s public.media_upload_session;position integer;
BEGIN
 IF p_purpose='ticket_image' THEN SELECT ticket_id INTO context_id FROM public.support_ticket_message WHERE id=p_target AND sender_account_id=auth.uid();
 ELSIF p_purpose='return_image' THEN SELECT sales_order_id INTO context_id FROM public.return_request WHERE id=p_target;
 ELSE RAISE EXCEPTION 'evidence_purpose_invalid' USING ERRCODE='22023'; END IF;
 IF context_id IS NULL OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),p_purpose,p_target,context_id,false),false) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>5 THEN RAISE EXCEPTION 'invalid_evidence' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_evidence' USING ERRCODE='22023'; END IF;
  selected:=(item#>>'{}')::uuid;IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_evidence' USING ERRCODE='22023'; END IF;seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>p_purpose OR coalesce(s.support_message_id,s.return_id) IS DISTINCT FROM p_target OR coalesce(s.ticket_id,s.sales_order_id) IS DISTINCT FROM context_id
   OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR (a.status='verified' AND (s.created_by IS DISTINCT FROM auth.uid() OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),p_purpose,p_target,context_id,true),false))) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
  IF p_purpose='ticket_image' THEN
   IF NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id AND message_id=p_target) THEN
    SELECT count(*) INTO position FROM public.support_ticket_message_attachment WHERE message_id=p_target;IF position>=5 THEN RAISE EXCEPTION 'evidence_limit' USING ERRCODE='22023'; END IF;
    INSERT INTO public.support_ticket_message_attachment(message_id,media_asset_id,file_name,file_size,media_type,display_order) VALUES(p_target,a.id,s.original_name,a.size_bytes,'image',position);
   END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id AND return_request_id=p_target) THEN
    SELECT count(*) INTO position FROM public.return_request_evidence WHERE return_request_id=p_target;IF position>=5 THEN RAISE EXCEPTION 'evidence_limit' USING ERRCODE='22023'; END IF;
    INSERT INTO public.return_request_evidence(return_request_id,media_asset_id,display_order) VALUES(p_target,a.id,position);
   END IF;
  END IF;
  UPDATE public.media_asset SET status='attached',legal_hold=true WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END LOOP;
END $$;
CREATE FUNCTION public.list_ticket_media(p_ticket uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_ticket) OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),'ticket_image',gen_random_uuid(),p_ticket,false),false) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'message_id',m.id,'media_asset_id',f.media_asset_id,'media_url',f.file_url,'file_name',f.file_name,'file_size',f.file_size) ORDER BY m.created_at,f.display_order,f.id),'[]') INTO result
 FROM public.support_ticket_message_attachment f JOIN public.support_ticket_message m ON m.id=f.message_id WHERE m.ticket_id=p_ticket AND coalesce(pawpal_private.evidence_access(auth.uid(),'ticket_image',m.id,p_ticket,false),false);
 RETURN result;
END $$;
CREATE FUNCTION public.list_return_media(p_return uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE context_id uuid;
BEGIN
 SELECT sales_order_id INTO context_id FROM public.return_request WHERE id=p_return;
 IF context_id IS NULL OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),'return_image',p_return,context_id,false),false) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'media_asset_id',media_asset_id,'media_url',image_url) ORDER BY display_order,id),'[]') FROM public.return_request_evidence WHERE return_request_id=p_return);
END $$;
REVOKE ALL ON FUNCTION pawpal_private.evidence_customer(uuid),pawpal_private.evidence_admin(uuid),pawpal_private.evidence_access(uuid,text,uuid,uuid,boolean),pawpal_private.media_session_manage(uuid,uuid,boolean),pawpal_private.attach_private_evidence(text,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_ticket_media(uuid),public.list_return_media(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_ticket_media(uuid),public.list_return_media(uuid) TO authenticated;
CREATE FUNCTION pawpal_private.can_read_ticket_attachment(p_message uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT pawpal_private.evidence_access(auth.uid(),'ticket_image',m.id,m.ticket_id,false) FROM public.support_ticket_message m WHERE m.id=p_message),false)
$$;
CREATE FUNCTION pawpal_private.can_read_return_evidence(p_return uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT pawpal_private.evidence_access(auth.uid(),'return_image',r.id,r.sales_order_id,false) FROM public.return_request r WHERE r.id=p_return),false)
$$;
REVOKE ALL ON FUNCTION pawpal_private.can_read_ticket_attachment(uuid),pawpal_private.can_read_return_evidence(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.can_read_ticket_attachment(uuid),pawpal_private.can_read_return_evidence(uuid) TO authenticated;
CREATE POLICY evidence_ticket_boundary ON public.support_ticket_message_attachment AS RESTRICTIVE FOR SELECT TO authenticated USING(pawpal_private.can_read_ticket_attachment(message_id));
CREATE POLICY evidence_return_boundary ON public.return_request_evidence AS RESTRICTIVE FOR SELECT TO authenticated USING(pawpal_private.can_read_return_evidence(return_request_id));
