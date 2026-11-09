ALTER TABLE public.media_upload_session ADD COLUMN review_id uuid,ADD COLUMN review_line_id uuid,ADD COLUMN review_kind text;
ALTER TABLE public.review_media ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.review_media ADD CONSTRAINT review_media_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
CREATE FUNCTION pawpal_private.review_media_access(p_user uuid,p_review uuid,p_line uuid,p_kind text,p_write boolean) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; r public.review;
BEGIN
 IF p_user IS NULL OR p_review IS NULL OR p_line IS NULL OR p_kind IS NULL OR p_kind NOT IN ('sales','service') THEN RETURN false;END IF;
 IF p_kind='sales' THEN SELECT o.customer_id INTO owner_id FROM public.sales_order_detail l JOIN public.sales_order o ON o.id=l.order_id WHERE l.id=p_line AND (NOT p_write OR o.order_status IN ('completed','delivered'));
 ELSE SELECT ap.customer_id INTO owner_id FROM public.appointment_item i JOIN public.appointment ap ON ap.id=i.appointment_id WHERE i.id=p_line AND (NOT p_write OR (ap.appointment_status='completed' AND i.status='completed'));END IF;
 IF owner_id IS NULL THEN RETURN false;END IF;
 SELECT * INTO r FROM public.review WHERE id=p_review;
 IF FOUND AND (CASE WHEN p_kind='sales' THEN r.sales_order_detail_id ELSE r.appointment_item_id END) IS DISTINCT FROM p_line THEN RETURN false;END IF;
 IF p_write AND r.id IS NOT NULL THEN RETURN false;END IF;
 IF NOT p_write AND pawpal_private.evidence_admin(p_user) THEN RETURN true;END IF;
 RETURN coalesce(pawpal_private.evidence_customer(p_user)=owner_id,false);
END $$;
CREATE FUNCTION pawpal_private.attach_review_media(p_review uuid,p_ids jsonb,p_allow_new boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.review;item jsonb;selected uuid;seen uuid[]:='{}';a public.media_asset;s public.media_upload_session;position integer;kind text;line_id uuid;
BEGIN
 SELECT * INTO r FROM public.review WHERE id=p_review FOR UPDATE;
 kind:=CASE WHEN r.sales_order_detail_id IS NOT NULL THEN 'sales' ELSE 'service' END;line_id:=coalesce(r.sales_order_detail_id,r.appointment_item_id);
 IF r.id IS NULL OR NOT pawpal_private.review_media_access(auth.uid(),p_review,line_id,kind,false) OR pawpal_private.evidence_customer(auth.uid()) IS NULL THEN RAISE EXCEPTION 'review_media_forbidden' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>5 THEN RAISE EXCEPTION 'invalid_review_media' USING ERRCODE='22023';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_review_media' USING ERRCODE='22023';END IF;
  selected:=(item#>>'{}')::uuid;IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_review_media' USING ERRCODE='22023';END IF;seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'review_image' OR s.review_id IS DISTINCT FROM r.id OR s.review_line_id IS DISTINCT FROM line_id OR s.review_kind IS DISTINCT FROM kind
   OR s.created_by IS DISTINCT FROM auth.uid() OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') THEN RAISE EXCEPTION 'review_media_forbidden' USING ERRCODE='42501';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id AND review_id=r.id) THEN
   IF NOT p_allow_new OR r.review_status<>'pending' THEN RAISE EXCEPTION 'review_media_frozen' USING ERRCODE='42501';END IF;
   SELECT count(*) INTO position FROM public.review_media WHERE review_id=r.id;IF position>=5 THEN RAISE EXCEPTION 'review_media_limit' USING ERRCODE='22023';END IF;
   INSERT INTO public.review_media(review_id,media_asset_id,display_order) VALUES(r.id,a.id,position);
  END IF;
  UPDATE public.media_asset SET status='attached' WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.review_media_access(uuid,uuid,uuid,text,boolean),pawpal_private.attach_review_media(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
