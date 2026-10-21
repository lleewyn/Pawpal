BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT auth_user_id::text FROM public.staff s JOIN public.staff_role sr ON sr.staff_id=s.id WHERE sr.role_code='ADMIN' LIMIT 1),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.permission)<>210 THEN RAISE EXCEPTION 'Existing ADMIN did not retain effective V1 permissions'; END IF;
 BEGIN
  INSERT INTO public.paw_point_transaction(customer_id,points,sequence_no,idempotency_key) VALUES(gen_random_uuid(),1,1,'DENIED');
  RAISE EXCEPTION 'Client ledger write was allowed' USING ERRCODE='XX000';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
UPDATE public.staff SET must_change_password=true WHERE auth_user_id=auth.uid();
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.permission)<>0 THEN RAISE EXCEPTION 'Password-change gate did not revoke staff permissions'; END IF;
END $$;
RESET ROLE;
UPDATE public.staff SET must_change_password=false,employment_status='inactive' WHERE auth_user_id=auth.uid();
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.permission)<>0 THEN RAISE EXCEPTION 'Inactive staff retained permissions'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.staff)<>0 OR (SELECT count(*) FROM public.permission)<>0 THEN RAISE EXCEPTION 'Unlinked identity obtained staff access'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.staff;
  RAISE EXCEPTION 'Anonymous staff access was allowed' USING ERRCODE='XX000';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
ROLLBACK;
