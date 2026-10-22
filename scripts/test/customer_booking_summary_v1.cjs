const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {state}=require('./customer_completion_helpers.cjs');
const ddl=fs.readFileSync('scripts/database/v1/065_customer_booking_summary.sql','utf8').replace(/^BEGIN;|^COMMIT;|^NOTIFY.*$/gm,'');
const query=`BEGIN; ${ddl}
DO $$ DECLARE uid uuid:=gen_random_uuid(); cid uuid; result jsonb; rejected boolean:=false;
BEGIN
 INSERT INTO auth.users(id) VALUES(uid);
 SELECT customer_id INTO cid FROM public.appointment LIMIT 1;
 IF cid IS NULL THEN RAISE EXCEPTION 'Missing restored booking fixture'; END IF;
 UPDATE public.customer SET auth_user_id=uid,customer_status='active' WHERE id=cid;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('role','authenticated',true);
 result:=public.own_service_booking_summary();
 IF jsonb_array_length(result)=0 THEN RAISE EXCEPTION 'Owner bookings missing'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) x WHERE NOT EXISTS(
  SELECT 1 FROM public.appointment a JOIN public.appointment_totals t ON t.appointment_id=a.id
  WHERE a.id=(x->>'id')::uuid AND a.customer_id=cid AND t.total_price=(x->>'total')::numeric))
 THEN RAISE EXCEPTION 'Owner scope or canonical totals mismatch'; END IF;
 PERFORM set_config('role','supabase_admin',true);
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 PERFORM set_config('role','authenticated',true);
 BEGIN PERFORM public.own_service_booking_summary(); EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unknown customer allowed'; END IF;
END $$; ROLLBACK;`;
const result=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',windowsHide:true});
if(result.status!==0)throw Error(result.stderr);
console.log('PASS owner booking summary, canonical totals and unknown-identity rejection; restored fixtures rolled back.');
