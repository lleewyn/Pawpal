BEGIN;
CREATE OR REPLACE FUNCTION public.get_public_site_notices()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',entry->>'id','content',entry->>'content',
  'type',entry->>'type','link',coalesce(entry->>'link','')) ORDER BY position),'[]'::jsonb)
 FROM public.pawpal_setting s
 CROSS JOIN LATERAL jsonb_array_elements(coalesce((s.setting_value::jsonb)->'websiteNotices','[]'))
 WITH ORDINALITY AS notice(entry,position)
 WHERE s.setting_key='system_config' AND entry->>'isActive'='true';
$$;
NOTIFY pgrst,'reload schema';
COMMIT;
