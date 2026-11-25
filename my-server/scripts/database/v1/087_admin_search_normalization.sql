BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.admin_search_text(value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS $$
 SELECT translate(lower(coalesce(value,'')),
 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd');
$$;
DO $$ DECLARE src text; BEGIN
 src:=pg_get_functiondef('public.admin_customer_page(text,text,text,text,integer,integer,text)'::regprocedure);
 src:=replace(src,'lower(', 'pawpal_private.admin_search_text(');EXECUTE src;
 src:=pg_get_functiondef('public.admin_pawpoint_page(text,text,integer,integer)'::regprocedure);
 src:=replace(src,'lower(', 'pawpal_private.admin_search_text(');EXECUTE src;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
