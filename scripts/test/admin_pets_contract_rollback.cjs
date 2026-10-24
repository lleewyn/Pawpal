const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Pet verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c uuid; b uuid; p uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); stamp timestamptz; details jsonb; BEGIN
c:=public.create_customer_quick('Pet rollback verification','09'||lpad(floor(random()*100000000)::text,8,'0'),'Test address','Test province');
IF (SELECT contact_email FROM public.customer WHERE id=c) IS NOT NULL THEN RAISE EXCEPTION 'quick owner email must be null';END IF;
SELECT pb.id INTO b FROM public.pet_breed pb JOIN public.pet_species ps ON ps.id=pb.species_id WHERE pb.is_active AND ps.is_active ORDER BY pb.id LIMIT 1;IF b IS NULL THEN RAISE EXCEPTION 'no active breed';END IF;
details:=jsonb_build_object('customer_id',c,'pet_name','Rollback pet','breed_id',b,'gender','unknown','safety_note','Independent safety note','allergy','Independent allergy','routine','Independent routine');
PERFORM public.save_admin_pet(p,NULL,details,4.5);
SELECT updated_at INTO stamp FROM public.pet_profile WHERE id=p;
PERFORM public.save_admin_pet(p,stamp,details||jsonb_build_object('pet_name','Rollback pet updated'),NULL);
SELECT updated_at INTO stamp FROM public.pet_profile WHERE id=p;
PERFORM public.record_admin_pet_weight(p,stamp,m,5.2,'Rollback check');PERFORM public.record_admin_pet_weight(p,stamp,m,5.2,'Rollback check');
IF (SELECT count(*) FROM public.pet_weight_history WHERE id=m)<>1 THEN RAISE EXCEPTION 'measurement duplicated';END IF;
BEGIN PERFORM public.save_admin_pet(p,stamp-interval '1 second',details,NULL);RAISE EXCEPTION 'stale update allowed';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;END;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.save_admin_pet(gen_random_uuid(),NULL,details,3);RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;SELECT 'PASS authenticated quick owner/address, pet create/update, weight idempotence, stale update and permission denial; all fixtures rolled back';`));
