const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',state=JSON.parse(fs.readFileSync(infra+'/customer-completion.private.txt'));
if(!/^pawpal_customers_[a-f0-9]{12}$/.test(state.stage))throw Error('Restored environment required');
const query=`BEGIN;
 SELECT set_config('request.jwt.claim.sub',(SELECT auth_user_id::text FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' LIMIT 1),true);
 DO $$ BEGIN IF has_function_privilege('anon','public.save_admin_pet(uuid,timestamptz,jsonb,numeric)','EXECUTE') OR has_function_privilege('anon','public.record_admin_pet_weight(uuid,timestamptz,uuid,numeric,text)','EXECUTE') OR has_function_privilege('anon','public.record_pet_contact(uuid,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous RPC access'; END IF; END $$;
 CREATE FUNCTION pg_temp.reject_pet_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced_audit_failure'; END $$;
 CREATE TRIGGER test_pet_audit_failure BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_pet_audit();
 SET LOCAL ROLE authenticated;
 DO $$ DECLARE pet public.pet_profile; draft jsonb; test_id uuid:=gen_random_uuid(); failed boolean:=false;
 BEGIN
 SELECT * INTO pet FROM public.pet_profile WHERE status='active' LIMIT 1;
 draft:=to_jsonb(pet)||jsonb_build_object('pet_name','Atomic test '||test_id,'date_of_birth',NULL,'gender','unknown');
 BEGIN PERFORM public.save_admin_pet(test_id,NULL,draft,3.5); EXCEPTION WHEN OTHERS THEN IF SQLERRM='forced_audit_failure' THEN failed:=true; ELSE RAISE; END IF; END;
 IF NOT failed OR EXISTS(SELECT 1 FROM public.pet_profile WHERE id=test_id) OR EXISTS(SELECT 1 FROM public.pet_weight_history WHERE pet_id=test_id) THEN RAISE EXCEPTION 'Pet/weight did not roll back with audit'; END IF;
 BEGIN PERFORM public.save_admin_pet(test_id,NULL,draft||jsonb_build_object('date_of_birth',(CURRENT_DATE+1)::text),3); RAISE EXCEPTION 'Future birth accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 BEGIN PERFORM public.record_admin_pet_weight(pet.id,pet.updated_at,gen_random_uuid(),-1,NULL); RAISE EXCEPTION 'Negative weight accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 END $$;
 RESET ROLE;
 DROP TRIGGER test_pet_audit_failure ON public.audit_log;
 SELECT set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 SET LOCAL ROLE authenticated;
 DO $$ BEGIN BEGIN PERFORM public.save_admin_pet(gen_random_uuid(),NULL,'{}',NULL); RAISE EXCEPTION 'Non-staff write accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
 ROLLBACK;`;
const file=state.folder+'/pet-integrity.private.sql';fs.writeFileSync(file,query);const target='/tmp/'+state.stage+'-pet-integrity.sql';execFileSync('docker',['cp',file,'supabase-db:'+target]);
try{execFileSync('docker',['exec','supabase-db','psql','-X','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1','-f',target],{stdio:['ignore','pipe','pipe']});console.log('PASS restored SQL rollback, pet+weight+audit atomicity, future date/negative weight validation, anonymous RPC and non-staff write denial.');}catch(e){fs.writeFileSync(state.folder+'/pet-test-error.private.log',e.stderr||'Unknown SQL error');console.error('Stage SQL failed; private log retained.');process.exitCode=1;}
