const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN; SET LOCAL statement_timeout='25s'; SET LOCAL lock_timeout='4s'");
 await db.query(fs.readFileSync(require.resolve('../database/v1/268_booking_inline_staff_confirmation.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE admin_uid uuid;revision timestamptz;request_id uuid:=gen_random_uuid();hold_id uuid:=gen_random_uuid();shift_id uuid;shift_revision timestamptz;before_audits bigint;other public.appointment; BEGIN
 SELECT s.auth_user_id INTO admin_uid FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1;
 IF admin_uid IS NULL THEN RAISE EXCEPTION 'admin_fixture_missing';END IF;
 DELETE FROM public.staff_schedule WHERE staff_id=worker;
 PERFORM public.hold_own_service_booking(hold_id,payload);
 payload:=payload||jsonb_build_object('hold_id',hold_id);q:=public.quote_own_service_booking(payload);
 PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 SELECT updated_at INTO revision FROM public.appointment WHERE id=aid;
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND staff_id IS NULL AND staff_confirmation_status='pending') THEN RAISE EXCEPTION 'pending fixture missing';END IF;
 BEGIN
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,request_id,starts,starts+interval '1 hour');
  RAISE EXCEPTION 'member confirmed booking';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 BEGIN
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision-interval '1 second',request_id,starts,starts+interval '1 hour');
  RAISE EXCEPTION 'stale revision accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'booking_changed_reload_required' THEN RAISE;END IF;END;
 BEGIN
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,request_id,starts+interval '1 minute',starts+interval '1 hour');
  RAISE EXCEPTION 'short shift accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'booking_shift_must_cover' THEN RAISE;END IF;END;
 IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=worker) THEN RAISE EXCEPTION 'failed calls left a shift';END IF;
 -- A successful call creates exactly one shift and assigns every live item.
 BEGIN
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,request_id,starts,starts+interval '1 hour');
  IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND staff_id=worker AND requested_staff_id=worker AND appointment_status='confirmed' AND staff_confirmation_status='confirmed') THEN RAISE EXCEPTION 'not confirmed';END IF;
  IF (SELECT count(*) FROM public.staff_schedule WHERE staff_id=worker)<>1 THEN RAISE EXCEPTION 'wrong shift count';END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=aid AND status<>'cancelled' AND staff_id IS DISTINCT FROM worker) THEN RAISE EXCEPTION 'item assignment missing';END IF;
  SELECT count(*) INTO before_audits FROM public.audit_log WHERE entity_id=request_id;
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,request_id,starts,starts+interval '1 hour');
  IF (SELECT count(*) FROM public.audit_log WHERE entity_id=request_id)<>before_audits THEN RAISE EXCEPTION 'replay duplicated writes';END IF;
  BEGIN
   PERFORM public.confirm_booking_staff_with_schedule(aid,revision,request_id,starts,starts+interval '2 hours');
   RAISE EXCEPTION 'changed replay accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'staff_request_conflict' THEN RAISE;END IF;END;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- Reuse a covering shift without modifying it.
 BEGIN
  INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(worker,starts-interval '1 hour',starts+interval '3 hours') RETURNING id,updated_at INTO shift_id,shift_revision;
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,gen_random_uuid(),starts,starts+interval '1 hour');
  IF (SELECT count(*) FROM public.staff_schedule WHERE staff_id=worker)<>1 OR (SELECT updated_at FROM public.staff_schedule WHERE id=shift_id)<>shift_revision THEN RAISE EXCEPTION 'covering shift changed';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- Extend one partial available shift, preserving its beginning.
 BEGIN
  INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(worker,starts-interval '30 minutes',starts+interval '30 minutes') RETURNING id INTO shift_id;
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,gen_random_uuid(),starts,starts+interval '1 hour');
  IF NOT EXISTS(SELECT 1 FROM public.staff_schedule WHERE id=shift_id AND start_at=starts-interval '30 minutes' AND end_at=starts+interval '1 hour') OR (SELECT count(*) FROM public.staff_schedule WHERE staff_id=worker)<>1 THEN RAISE EXCEPTION 'partial shift not extended';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- Extra shift hours may not overwrite existing leave.
 BEGIN
  INSERT INTO public.staff_schedule(staff_id,start_at,end_at,availability_status,reason) VALUES(worker,starts+interval '2 hours',starts+interval '3 hours','leave','Verification');
  BEGIN
   PERFORM public.confirm_booking_staff_with_schedule(aid,revision,gen_random_uuid(),starts,starts+interval '4 hours');
   RAISE EXCEPTION 'leave overwritten';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'staff_not_available' THEN RAISE;END IF;END;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=worker AND availability_status='available') THEN RAISE EXCEPTION 'leave failure left a shift';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- A second service booked in the same slot blocks confirmation and rolls back its new shift.
 BEGIN
  SELECT * INTO other FROM public.appointment WHERE id=aid;
  other.id:=gen_random_uuid();other.appointment_code:='TEST-'||other.id;other.requested_staff_id:=NULL;
  other.staff_confirmation_status:='not_required';other.staff_id:=worker;other.appointment_status:='confirmed';
  INSERT INTO public.appointment SELECT (other).*;
  BEGIN
   PERFORM public.confirm_booking_staff_with_schedule(aid,revision,gen_random_uuid(),starts,starts+interval '1 hour');
   RAISE EXCEPTION 'busy worker confirmed';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'preferred_staff_unavailable' THEN RAISE;END IF;END;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=worker) THEN RAISE EXCEPTION 'conflict leaked shift';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- Downstream eligibility failure rolls back the shift and its audit too.
 UPDATE public.staff SET staff_level_id=NULL WHERE id=worker;
 BEGIN
  PERFORM public.confirm_booking_staff_with_schedule(aid,revision,gen_random_uuid(),starts,starts+interval '1 hour');
  RAISE EXCEPTION 'unqualified worker confirmed';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'preferred_staff_unavailable' THEN RAISE;END IF;END;
 IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=worker) OR EXISTS(SELECT 1 FROM public.audit_log WHERE entity_name='staff_schedule' AND description LIKE '%'||worker::text||'%') THEN RAISE EXCEPTION 'failed confirmation leaked shift or audit';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND staff_id IS NULL AND appointment_status='pending') THEN RAISE EXCEPTION 'failure changed appointment';END IF;
 IF has_function_privilege('anon','public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'unsafe grant';END IF;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK TO SAVEPOINT fixtures');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS inline confirmation: permissions, revisions, shift coverage, atomic create/confirm, item sync, replay, existing/partial shifts, leave and rollback on failed eligibility. All fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}})().catch(error=>{console.error(error.message,error.where||'');process.exitCode=1;});
