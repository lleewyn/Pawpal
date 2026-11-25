-- Provisioning must satisfy the phone-required INSERT trigger introduced by migration 129.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.v185_function_backup(definition text NOT NULL);
REVOKE ALL ON pawpal_private.v185_function_backup FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE source text; needle text;
BEGIN
 SELECT pg_get_functiondef('public.create_admin_staff_profile(uuid,uuid,uuid,jsonb,text[],text[])'::regprocedure) INTO source;
 needle:='INSERT INTO public.staff(id,auth_user_id,full_name,job_title,must_change_password)';
 IF strpos(source,needle)=0 OR strpos(source,'VALUES(p_staff_id,p_auth_user_id,p_details->>''full_name'',p_details->>''job_title'',true)')=0 THEN RAISE EXCEPTION 'unexpected_staff_provision_definition'; END IF;
 INSERT INTO pawpal_private.v185_function_backup VALUES(source);
 source:=replace(source,needle,'INSERT INTO public.staff(id,auth_user_id,full_name,job_title,must_change_password,phone_number)');
 source:=replace(source,'VALUES(p_staff_id,p_auth_user_id,p_details->>''full_name'',p_details->>''job_title'',true)','VALUES(p_staff_id,p_auth_user_id,p_details->>''full_name'',p_details->>''job_title'',true,p_details->>''phone_number'')');
 EXECUTE source;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
