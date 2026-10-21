-- Chay TOAN BO file trong SQL Editor cua Supabase CLOUD CU.
-- Xuat cac bang nghiep vu public, gom khach, thu cung, don, lich, diem, nhan su...
-- Chi tao ham TAM pg_temp, khong ghi/sua/xoa bang nghiep vu.
-- Khong doc auth/storage/private schemas, mat khau, OTP, API key hay phien Auth.
-- Day la ban xuat nghiep vu de anh xa sang V1, KHONG phai full database backup.
CREATE OR REPLACE FUNCTION pg_temp.pawpal_export_business_data(
    batch_size integer DEFAULT 250,
    batch_offset integer DEFAULT 0
) RETURNS TABLE (
    source_table text,
    status text,
    total_rows bigint,
    exported_rows integer,
    rows_after_filter bigint,
    excluded_columns text[],
    column_schema jsonb,
    foreign_keys jsonb,
    rows_json jsonb
) LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE
    item record;
    selected_names text[];
    projection text;
    filter_sql text;
    key_name text;
BEGIN
    IF batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 500 OR batch_offset IS NULL OR batch_offset<0 THEN
        RAISE EXCEPTION 'batch_size must be 1..500; batch_offset must be >= 0';
    END IF;
    FOR item IN
        SELECT c.oid,c.relname
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition
        ORDER BY c.relname
    LOOP
        source_table:='public.'||item.relname;
        status:='pending'; total_rows:=NULL; exported_rows:=0; rows_after_filter:=NULL;
        excluded_columns:='{}'::text[];column_schema:='[]'::jsonb;foreign_keys:='[]'::jsonb;rows_json:='[]'::jsonb;
        IF item.relname ~* '(api_?keys?|credentials?|auth_sessions?|auth_challenges?|refresh_tokens?|access_tokens?|otp|rate_limits?)'
           OR item.relname IN ('customer_activation_sms','sessions','session','secrets') THEN
            status:='excluded_sensitive_table';
            RETURN NEXT; CONTINUE;
        END IF;
        SELECT array_agg(a.attname ORDER BY a.attnum) FILTER(WHERE a.attname !~* '(password|passwd|secret|token|otp|api_?key|activation_url|verification_code|recovery_code)'),
               coalesce(array_agg(a.attname ORDER BY a.attnum) FILTER(WHERE a.attname ~* '(password|passwd|secret|token|otp|api_?key|activation_url|verification_code|recovery_code)'),'{}'::text[]),
               coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY a.attnum)
                        FILTER(WHERE a.attname !~* '(password|passwd|secret|token|otp|api_?key|activation_url|verification_code|recovery_code)'),'[]'::jsonb)
        INTO selected_names,excluded_columns,column_schema
        FROM pg_attribute a WHERE a.attrelid=item.oid AND a.attnum>0 AND NOT a.attisdropped;
        SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'definition',pg_get_constraintdef(k.oid)) ORDER BY k.conname),'[]'::jsonb)
        INTO foreign_keys FROM pg_constraint k WHERE k.conrelid=item.oid AND k.contype IN ('p','u','f');
        IF selected_names IS NULL THEN status:='no_exportable_columns'; RETURN NEXT; CONTINUE; END IF;
        SELECT string_agg(format('%I',name),', ') INTO projection FROM unnest(selected_names) names(name);
        filter_sql:='';
        -- Settings tables can contain credentials in rows rather than named columns.
        IF item.relname IN ('pawpal_setting','settings','setting','system_settings','app_settings') THEN
            SELECT name INTO key_name FROM unnest(ARRAY['setting_key','key','name','config_key']) WITH ORDINALITY x(name,position)
            WHERE name=ANY(selected_names) ORDER BY position LIMIT 1;
            IF key_name IS NULL THEN status:='excluded_unclassified_settings'; RETURN NEXT; CONTINUE; END IF;
            filter_sql:=format(' WHERE coalesce(%I::text,'''') !~* %L',key_name,'(password|passwd|secret|token|otp|api.?key|credential|smtp|private.?key)');
        END IF;
        BEGIN
            EXECUTE format('SELECT count(*) FROM public.%I',item.relname) INTO total_rows;
            EXECUTE format('SELECT count(*) FROM public.%I%s',item.relname,filter_sql) INTO rows_after_filter;
            -- JSONB supports sorting even if source fields use json or arrays.
            -- No DISTINCT: preserve source multiplicity; do not silently deduplicate business rows.
            EXECUTE format(
                'SELECT coalesce(jsonb_agg(row_data ORDER BY row_data),''[]''::jsonb) FROM '
                ||'(SELECT to_jsonb(r) row_data FROM (SELECT %s FROM public.%I%s) r ORDER BY row_data OFFSET $1 LIMIT $2) batch',
                projection,item.relname,filter_sql
            ) INTO rows_json USING batch_offset,batch_size;
            exported_rows:=jsonb_array_length(rows_json);
            status:=CASE WHEN rows_after_filter=0 AND total_rows>0 THEN 'all_rows_filtered'
                         WHEN rows_after_filter=0 THEN 'empty'
                         WHEN batch_offset+exported_rows<rows_after_filter THEN 'more_rows'
                         WHEN batch_offset>=rows_after_filter THEN 'offset_past_end'
                         WHEN cardinality(excluded_columns)>0 OR rows_after_filter<>total_rows THEN 'complete_filtered'
                         ELSE 'complete' END;
        EXCEPTION WHEN insufficient_privilege THEN status:='access_denied';
                  WHEN OTHERS THEN status:='query_error_'||SQLSTATE;
        END;
        RETURN NEXT;
    END LOOP;
END $$;

-- MOT DONG ket qua de SQL Editor khong cat danh sach bang o nguong 100 dong.
-- Xuat CSV hoac copy ca dong ket qua gui lai, bao gom export_json.
-- Neu tables_with_more_rows > 0: chay lai TOAN BO file va doi page_offset = 0 thanh 250, 500... o CTE settings.
-- Can ngung sua du lieu nguon giua cac lan xuat de tranh lech trang; day khong phai snapshot backup.
WITH settings AS (
    SELECT 250 AS page_size, 0 AS page_offset
), exported AS MATERIALIZED (
    SELECT result.* FROM settings
    CROSS JOIN LATERAL pg_temp.pawpal_export_business_data(settings.page_size,settings.page_offset) AS result
)
SELECT
    now() AS exported_at,
    (SELECT page_offset FROM settings) AS page_offset,
    count(*) AS tables_total,
    count(*) FILTER(WHERE status='more_rows') AS tables_with_more_rows,
    coalesce(jsonb_agg(to_jsonb(exported) ORDER BY source_table),'[]'::jsonb) AS export_json
FROM exported;
