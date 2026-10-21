-- Chay tren SQL Editor cua Supabase CLOUD CU.
-- Lay TOAN BO bang gia trong mot dong ket qua; khong phu thuoc ham pg_temp cua lan chay truoc.
-- Khong sua du lieu. Gui lai ket qua nay de doi chieu 102/102 dong thay cho ban 100 dong.
SELECT
    'service_price_matrix'::text AS dataset,
    count(*) AS total_rows,
    coalesce(jsonb_agg(to_jsonb(price_row) ORDER BY price_row.id),'[]'::jsonb) AS rows_json
FROM (
    SELECT id, service_id, weight_from, weight_to, unit_price,
           effective_from, effective_to, status
    FROM public.service_price_matrix
) AS price_row;
