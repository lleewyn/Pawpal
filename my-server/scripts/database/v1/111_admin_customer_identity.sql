-- User authorized production apply after rollback verification, 26/10/2026.
-- Account identity is independent of loyalty membership.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_customer_page(p_query text DEFAULT '',p_tier text DEFAULT 'ALL',p_status text DEFAULT 'ALL',p_category text DEFAULT 'ALL',p_page integer DEFAULT 1,p_size integer DEFAULT 10,p_lookup text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='5s' AS $$
DECLARE result jsonb; permission_name text; size_value integer:=least(greatest(coalesce(p_size,10),1),100);page_value integer:=greatest(coalesce(p_page,1),1);
BEGIN
 FOREACH permission_name IN ARRAY ARRAY['customer','customer_profile','customer_phone','customer_membership','customer_address','pet_profile','pet_breed','pet_species','pet_weight_history','paw_point_transaction','membership_tier','support_ticket'] LOOP
 IF NOT pawpal_private.has_permission(permission_name||'.read') THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';END IF;END LOOP;
 IF length(coalesce(p_query,''))>200 OR length(coalesce(p_lookup,''))>200 THEN RAISE EXCEPTION 'invalid_filter';END IF;
 WITH base AS MATERIALIZED(
  SELECT c.id,c.created_at,c.customer_code,pr.full_name,ph.phone_number,c.auth_user_id IS NOT NULL AS member,
   CASE WHEN c.customer_status IN('locked','bi_khoa') THEN 'LOCKED' WHEN c.customer_status IN('suspended','tam_khoa') THEN 'SUSPENDED' WHEN c.auth_user_id IS NULL THEN 'TEMP' ELSE 'ACTIVE' END AS status,
   CASE t.tier_name WHEN 'Đồng' THEN 'BRONZE' WHEN 'Bạc' THEN 'SILVER' WHEN 'Vàng' THEN 'GOLD' WHEN 'Kim Cương' THEN 'DIAMOND' WHEN 'Kim cương' THEN 'DIAMOND' ELSE 'NONE' END AS tier,
   EXISTS(SELECT 1 FROM public.support_ticket st WHERE st.customer_id=c.id AND st.status NOT IN('resolved','closed','rejected','da_giai_quyet','da_dong','tu_choi')) AS complaint
  FROM public.customer c LEFT JOIN public.customer_profile pr ON pr.customer_id=c.id LEFT JOIN public.customer_membership m ON m.customer_id=c.id LEFT JOIN public.membership_tier t ON t.id=m.membership_tier_id
  LEFT JOIN LATERAL(SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id AND is_primary ORDER BY id LIMIT 1) ph ON true
 ), matched AS MATERIALIZED(
 SELECT * FROM base b WHERE
 (coalesce(p_lookup,'')='' OR b.id::text=p_lookup OR b.customer_code=p_lookup)
 AND (p_tier='ALL' OR b.tier=p_tier)
 AND (p_status='ALL' OR b.status=p_status OR (p_status='ACTIVE' AND b.status='TEMP') OR (p_status='LOCKED' AND b.status='SUSPENDED'))
 AND (p_category='ALL' OR (p_category='MEMBER' AND b.member) OR (p_category='TEMP' AND NOT b.member) OR (p_category='LOCKED' AND b.status IN('LOCKED','SUSPENDED')) OR (p_category='COMPLAINT' AND b.complaint))
 AND (coalesce(trim(p_query),'')='' OR strpos(lower(concat_ws(' ',b.id::text,b.customer_code,b.full_name,b.phone_number)),lower(trim(p_query)))>0
 OR EXISTS(SELECT 1 FROM public.customer c WHERE c.id=b.id AND strpos(lower(coalesce(c.contact_email,'')),lower(trim(p_query)))>0)
 OR EXISTS(SELECT 1 FROM public.pet_profile p LEFT JOIN public.pet_breed br ON br.id=p.breed_id LEFT JOIN public.pet_species sp ON sp.id=br.species_id WHERE p.customer_id=b.id AND strpos(lower(concat_ws(' ',p.pet_name,br.breed_name,sp.species_name)),lower(trim(p_query)))>0))
 ), totals AS(SELECT count(*) AS total FROM matched), page_ids AS MATERIALIZED(
 SELECT id FROM matched ORDER BY created_at DESC,id LIMIT size_value OFFSET (least(page_value,greatest(1,(SELECT ceil(total::numeric/size_value)::integer FROM totals)))-1)*size_value
 ), ops AS MATERIALIZED(
 SELECT st.id,st.ticket_code,st.customer_id,st.subject,st.status,st.priority,st.created_at FROM public.support_ticket st WHERE size_value=10 AND coalesce(p_lookup,'')='' AND st.status NOT IN('resolved','closed','rejected','da_giai_quyet','da_dong','tu_choi') ORDER BY st.created_at,st.id LIMIT 20
 ), ids AS MATERIALIZED(SELECT id FROM page_ids UNION SELECT customer_id FROM ops)
 SELECT jsonb_build_object(
 'total',(SELECT total FROM totals),'page',least(page_value,greatest(1,(SELECT ceil(total::numeric/size_value)::integer FROM totals))),
 'pageIds',coalesce((SELECT jsonb_agg(id) FROM page_ids),'[]'::jsonb),
 'stats',(SELECT jsonb_build_object('total',count(*),'member',count(*) FILTER(WHERE member),'guest',count(*) FILTER(WHERE NOT member),'locked',count(*) FILTER(WHERE status IN('LOCKED','SUSPENDED')),'complaint',count(*) FILTER(WHERE complaint)) FROM base),
 'opsTotal',(SELECT count(*) FROM public.support_ticket WHERE status NOT IN('resolved','closed','rejected','da_giai_quyet','da_dong','tu_choi')),
 'operations',coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM ops o),'[]'::jsonb),
 'custData',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'customer_code',c.customer_code,'customer_type',CASE WHEN c.auth_user_id IS NULL THEN 'guest' ELSE 'member' END,'contact_email',c.contact_email,'customer_status',c.customer_status,'note',c.note,'created_at',c.created_at,'updated_at',c.updated_at) ORDER BY c.created_at DESC,c.id) FROM public.customer c WHERE c.id IN(SELECT id FROM ids)),'[]'::jsonb),
 'profData',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM public.customer_profile p WHERE p.customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'memData',coalesce((SELECT jsonb_agg(jsonb_build_object('customer_id',m.customer_id,'membership_tier_id',m.membership_tier_id,'membership_tier',jsonb_build_object('tier_name',t.tier_name))) FROM public.customer_membership m LEFT JOIN public.membership_tier t ON t.id=m.membership_tier_id WHERE m.customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'phonesData',coalesce((SELECT jsonb_agg(jsonb_build_object('customer_id',customer_id,'phone_number',phone_number)) FROM public.customer_phone WHERE is_primary AND customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'addrData',coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM public.customer_address a WHERE a.customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'petsData',coalesce((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('breed',to_jsonb(br)||jsonb_build_object('species',to_jsonb(sp)))) FROM public.pet_profile p LEFT JOIN public.pet_breed br ON br.id=p.breed_id LEFT JOIN public.pet_species sp ON sp.id=br.species_id WHERE p.customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'balancesData',coalesce((SELECT jsonb_agg(to_jsonb(b)) FROM public.customer_point_balance b WHERE b.customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'weightsData',coalesce((SELECT jsonb_agg(to_jsonb(w)) FROM public.pet_current_weight w JOIN public.pet_profile p ON p.id=w.pet_id WHERE p.customer_id IN(SELECT id FROM ids)),'[]'::jsonb),
 'tiersData',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY minimum_expenditure,id) FROM public.membership_tier t WHERE is_active),'[]'::jsonb),
 'ticketsData',coalesce((SELECT jsonb_agg(jsonb_build_object('id',st.id,'ticket_code',st.ticket_code,'customer_id',st.customer_id,'subject',st.subject,'status',st.status,'priority',st.priority,'created_at',st.created_at)) FROM public.support_ticket st WHERE st.customer_id IN(SELECT id FROM ids)),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_customer_page(text,text,text,text,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_page(text,text,text,text,integer,integer,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
