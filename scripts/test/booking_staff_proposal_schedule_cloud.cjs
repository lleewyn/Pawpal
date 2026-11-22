const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='25s';SET LOCAL lock_timeout='4s'");
 await db.query(fs.readFileSync(require.resolve('../database/v1/269_booking_staff_proposal_schedule.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE admin_uid uuid;revision timestamptz;proposal_revision timestamptz;worker2 uuid:=gen_random_uuid();worker2_auth uuid:=gen_random_uuid();hold_id uuid:=gen_random_uuid();other public.appointment;BEGIN
 SELECT s.auth_user_id INTO admin_uid FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1;
 INSERT INTO auth.users(id) VALUES(worker2_auth);
 INSERT INTO public.staff(id,full_name,job_title,staff_level_id,employment_status,auth_user_id,phone_number) VALUES(worker2,'Proposal alternative','Care',level_id,'active',worker2_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'));
 DELETE FROM public.staff_schedule WHERE staff_id=worker;
 PERFORM public.hold_own_service_booking(hold_id,payload);payload:=payload||jsonb_build_object('hold_id',hold_id);q:=public.quote_own_service_booking(payload);
 PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 SELECT updated_at INTO revision FROM public.appointment WHERE id=aid;
 BEGIN
  PERFORM public.propose_booking_staff(aid,revision,worker2,starts,'Alternative worker');RAISE EXCEPTION 'member proposed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 BEGIN
  PERFORM public.propose_booking_staff(aid,revision-interval '1 second',worker2,starts,'Alternative worker');RAISE EXCEPTION 'stale proposal accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'booking_changed_reload_required' THEN RAISE;END IF;END;
 -- Neither original nor alternative is rostered. Proposal only rosters the alternative.
 BEGIN
  PERFORM public.propose_booking_staff(aid,revision,worker2,starts,'Alternative worker');
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=worker) THEN RAISE EXCEPTION 'original worker incorrectly rostered';END IF;
  IF (SELECT count(*) FROM public.staff_schedule WHERE staff_id=worker2 AND start_at<=starts AND end_at>=starts+interval '1 hour')<>1 THEN RAISE EXCEPTION 'alternative shift missing';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND requested_staff_id=worker AND staff_id IS NULL AND appointment_status='pending' AND staff_confirmation_status='awaiting_customer' AND proposal_staff_id=worker2 AND scheduled_start_at=starts) THEN RAISE EXCEPTION 'proposal changed original booking';END IF;
  SELECT proposal_created_at INTO proposal_revision FROM public.appointment WHERE id=aid;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  PERFORM public.respond_own_booking_staff_request(aid,proposal_revision,false);
  IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND requested_staff_id=worker AND staff_id IS NULL AND staff_confirmation_status='pending') THEN RAISE EXCEPTION 'decline changed requested worker';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 -- Acceptance confirms the alternative directly, without ever confirming the original.
 BEGIN
  PERFORM public.propose_booking_staff(aid,revision,worker2,starts+interval '1 hour','New worker and new time');
  SELECT proposal_created_at INTO proposal_revision FROM public.appointment WHERE id=aid;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  PERFORM public.respond_own_booking_staff_request(aid,proposal_revision,true);
  IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND requested_staff_id=worker2 AND staff_id=worker2 AND staff_confirmation_status='confirmed' AND appointment_status='confirmed' AND scheduled_start_at=starts+interval '1 hour') THEN RAISE EXCEPTION 'alternative not confirmed';END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=aid AND status<>'cancelled' AND staff_id IS DISTINCT FROM worker2) THEN RAISE EXCEPTION 'items not synchronized';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 -- A busy alternative cannot be proposed; its temporary shift is rolled back.
 BEGIN
  SELECT * INTO other FROM public.appointment WHERE id=aid;
  other.id:=gen_random_uuid();other.appointment_code:='TEST-'||other.id;other.requested_staff_id:=NULL;other.staff_confirmation_status:='not_required';other.staff_id:=worker2;other.appointment_status:='confirmed';
  INSERT INTO public.appointment SELECT (other).*;
  BEGIN
   PERFORM public.propose_booking_staff(aid,revision,worker2,starts,'Busy alternative');RAISE EXCEPTION 'busy alternative proposed';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'proposal_staff_unavailable' THEN RAISE;END IF;END;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=worker2) THEN RAISE EXCEPTION 'busy alternative leaked a shift';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- Leave is protected without requiring any work on the original worker.
 BEGIN
  INSERT INTO public.staff_schedule(staff_id,start_at,end_at,availability_status,reason) VALUES(worker2,starts,starts+interval '2 hours','leave','Verification');
  BEGIN
   PERFORM public.propose_booking_staff(aid,revision,worker2,starts,'Worker on leave');RAISE EXCEPTION 'leave accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'staff_not_available' THEN RAISE;END IF;END;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- Price validation failure also rolls back the new shift and its audit.
 UPDATE public.service_price_matrix SET unit_price=unit_price+1 WHERE service_id=sid;
 BEGIN
  PERFORM public.propose_booking_staff(aid,revision,worker2,starts,'Changed price');RAISE EXCEPTION 'changed price accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'booking_price_changed_requires_review' THEN RAISE;END IF;END;
 IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id IN(worker,worker2)) THEN RAISE EXCEPTION 'failed proposal left a shift';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND requested_staff_id=worker AND staff_id IS NULL AND staff_confirmation_status='pending') THEN RAISE EXCEPTION 'failed proposal changed booking';END IF;
 IF has_function_privilege('anon','public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text)','EXECUTE') THEN RAISE EXCEPTION 'unsafe grant';END IF;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK TO SAVEPOINT fixtures');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS alternative proposal without original shift: target shift, consent accept/decline, stale revision, permissions, collision, leave, changed-price rollback and item sync. All fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}})().catch(error=>{console.error(error.message,error.where||'');process.exitCode=1;});
