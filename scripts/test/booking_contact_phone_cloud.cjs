const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='25s';SET LOCAL lock_timeout='4s'");
 await db.query(fs.readFileSync(require.resolve('../database/v1/216_booking_contact_phone.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE held uuid:=gen_random_uuid();account_phone text:='099'||lpad(floor(random()*10000000)::text,7,'0');phone_row uuid:=gen_random_uuid();legacy_id uuid:=gen_random_uuid();admin_uid uuid;other_uid uuid:=gen_random_uuid();other_customer uuid:=gen_random_uuid();old_payload jsonb;
 BEGIN
 INSERT INTO public.customer_phone(id,customer_id,phone_number,is_primary,verified_at) VALUES(phone_row,cid,account_phone,true,now());
 payload:=payload||jsonb_build_object('contact_phone','0911556677');
 PERFORM public.hold_own_service_booking(held,payload);payload:=payload||jsonb_build_object('hold_id',held);
 q:=public.quote_own_service_booking(payload);PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND customer_id=cid AND booking_contact_phone='0911556677' AND appointment_status='confirmed') THEN RAISE EXCEPTION 'alternate phone changed owner or was not stored';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.customer_phone WHERE id=phone_row AND phone_number=account_phone AND is_primary) OR (SELECT count(*) FROM public.customer_phone WHERE customer_id=cid)<>1 THEN RAISE EXCEPTION 'account phone was modified';END IF;
 result:=public.own_service_booking_summary();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result) v WHERE v->>'id'=aid::text AND v->>'contact_phone'='0911556677') THEN RAISE EXCEPTION 'owner summary missing contact phone';END IF;
 old_payload:=payload;
 BEGIN PERFORM public.quote_own_service_booking(payload||jsonb_build_object('contact_phone','abc'));RAISE EXCEPTION 'invalid phone accepted';EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'invalid_booking_contact_phone' THEN RAISE;END IF;END;
 BEGIN PERFORM public.quote_own_service_booking(payload||jsonb_build_object('contact_phone',''));RAISE EXCEPTION 'blank phone accepted';EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'invalid_booking_contact_phone' THEN RAISE;END IF;END;
 payload:=(payload-'contact_phone'-'hold_id')||jsonb_build_object('scheduled_start_at',starts+interval '1 hour');held:=gen_random_uuid();
 PERFORM public.hold_own_service_booking(held,payload);payload:=payload||jsonb_build_object('hold_id',held);q:=public.quote_own_service_booking(payload);
 PERFORM public.create_own_service_booking(legacy_id,q->>'version',payload);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=legacy_id AND booking_contact_phone=account_phone) THEN RAISE EXCEPTION 'legacy caller default phone missing';END IF;
 SELECT st.auth_user_id INTO admin_uid FROM public.staff st JOIN public.staff_role role ON role.staff_id=st.id WHERE role.role_code='ADMIN' AND st.auth_user_id IS NOT NULL LIMIT 1;
 IF admin_uid IS NULL THEN RAISE EXCEPTION 'missing admin fixture';END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 result:=public.get_admin_service_booking_page(jsonb_build_object('query','0911556677'),1,true);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'ids') v WHERE v#>>'{}'=aid::text) THEN RAISE EXCEPTION 'Admin search missing alternate phone';END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'exportRows') v WHERE v->>0=(SELECT appointment_code FROM public.appointment WHERE id=aid) AND v->>4='0911556677') THEN RAISE EXCEPTION 'Admin export shows account phone';END IF;
 INSERT INTO auth.users(id) VALUES(other_uid);INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(other_customer,other_uid,'QA-'||other_customer,'active');
 PERFORM set_config('request.jwt.claim.sub',other_uid::text,true);result:=public.own_service_booking_summary();
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) v WHERE v->>'id'=aid::text) THEN RAISE EXCEPTION 'another account sees the appointment';END IF;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK TO SAVEPOINT fixtures');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS alternate contact phone saved, original owner and login phone preserved, idempotency, owner summary, Admin search/export, invalid input rejected, legacy default, other owner isolated. Fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;});
