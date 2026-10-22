// Transactional fixtures on the restored database only; all writes roll back.
const {execFileSync}=require('node:child_process');
const {state}=require('./customer_completion_helpers.cjs');
const sql=`BEGIN;
CREATE TEMP TABLE fixture AS SELECT id,customer_id,payment_method_config_id,order_id,appointment_id FROM public.payment LIMIT 1;
INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,idempotency_key,order_id,appointment_id)
 SELECT '11111111-4444-4444-8444-111111111111','DASH-VERIFY-1',customer_id,payment_method_config_id,'verification',120,'succeeded','2095-01-01 16:59:59+00','dash-verify-1',order_id,appointment_id FROM fixture;
INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,idempotency_key,order_id,appointment_id)
 SELECT gen_random_uuid(),'DASH-VERIFY-2',customer_id,payment_method_config_id,'verification',30,'succeeded','2095-01-01 17:00:00+00','dash-verify-2',order_id,appointment_id FROM fixture;
INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,idempotency_key,order_id,appointment_id)
 SELECT gen_random_uuid(),'DASH-VERIFY-PENDING',customer_id,payment_method_config_id,'verification',999,'pending',NULL,'dash-verify-pending',order_id,appointment_id FROM fixture;
INSERT INTO public.refund_transaction(refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,completed_at)
 VALUES('DASH-VERIFY-REFUND','11111111-4444-4444-8444-111111111111','verification',80,80,80,'cash','succeeded','2095-01-01 17:00:00+00');
SELECT set_config('request.jwt.claim.sub',(SELECT s.auth_user_id::text FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE data jsonb; BEGIN
 data:=public.get_admin_dashboard_cashflow('2095-01-01','2095-01-03');
 IF (data->'days'->0->>'net')::numeric<>120 OR (data->'days'->1->>'net')::numeric<>-50 OR (data->'days'->2->>'net')::numeric<>0 THEN RAISE EXCEPTION 'Cashflow boundary/negative/pending exclusion failed'; END IF;
 BEGIN PERFORM public.get_admin_dashboard_cashflow('2095-01-01','2095-03-01');RAISE EXCEPTION 'Oversized period accepted';EXCEPTION WHEN SQLSTATE '22023' THEN NULL;END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.get_admin_dashboard_cashflow('2095-01-01','2095-01-03');RAISE EXCEPTION 'Non-staff accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
ROLLBACK;`;
execFileSync('docker',['exec','-i','supabase-db','psql','-X','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1','-f','-'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});
console.log('PASS Bangkok midnight boundary, partial receipts/refund dates, negative/zero net, pending exclusion, range guard and unauthorized denial; fixtures rolled back.');
