const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='3s'");
 await db.query(fs.readFileSync(require.resolve('../database/v1/210_guest_booking_choices.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query(fs.readFileSync(require.resolve('../database/v1/211_guest_activation_demo_date.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE token text:=repeat(replace(gen_random_uuid()::text,'-',''),2);guest_pet uuid:=gen_random_uuid();guest_owner uuid;h jsonb;held uuid:=gen_random_uuid();readback jsonb;breed_text text:='Custom guest breed '||gen_random_uuid();species_name_value text;revision text;
 BEGIN
 SELECT species_name INTO species_name_value FROM public.pet_species WHERE id=species;
 PERFORM public.guest_commerce_save_pet(token,now()+interval '1 day',guest_pet,'0950000013','Guest choices verification',jsonb_build_object('name','Guest pet','speciesName',species_name_value,'breedName',breed_text,'weight',3.8,'gender','nu'));
 readback:=public.guest_commerce_context(token,1);
 IF readback->'pets'->0->>'breedName' IS DISTINCT FROM breed_text OR readback->'pets'->0->>'speciesName' IS DISTINCT FROM species_name_value THEN RAISE EXCEPTION 'custom breed context missing';END IF;
 readback:=public.guest_profile_read(token,guest_pet);revision:=readback->'pet'->>'revision';
 PERFORM public.guest_profile_update(token,repeat('c',64),gen_random_uuid(),revision,NULL,jsonb_build_object('id',guest_pet,'name','Guest pet','speciesName',species_name_value,'breedName',breed_text||' updated','weight',3.8,'gender','nu'));
 readback:=public.guest_profile_read(token,guest_pet);
 IF readback->'pet'->>'breedName' IS DISTINCT FROM breed_text||' updated' THEN RAISE EXCEPTION 'custom breed edit missing';END IF;
 SELECT customer_id INTO guest_owner FROM public.guest_session WHERE token_hash=token;
 payload:=payload||jsonb_build_object('pet_id',guest_pet);
 h:=public.guest_booking_hold(token,held,payload);
 IF (h->>'expires_at')::timestamptz<clock_timestamp()+interval '14 minutes 59 seconds' THEN RAISE EXCEPTION 'hold duration wrong';END IF;
 result:=public.own_booking_availability(payload||jsonb_build_object('pet_id',pid));
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'staff') s WHERE s->>'id'=worker::text) THEN RAISE EXCEPTION 'guest hold not respected by members';END IF;
 PERFORM set_config('request.jwt.claim.role','service_role',true);PERFORM set_config('request.jwt.claim.sub','',true);
 UPDATE pawpal_private.member_booking_hold SET expires_at=clock_timestamp()-interval '1 second' WHERE customer_id=guest_owner;
 payload:=payload||jsonb_build_object('hold_id',held);q:=public.guest_booking_quote(token,payload);
 BEGIN PERFORM public.guest_booking_create(token,aid,q->>'version',payload);RAISE EXCEPTION 'expired guest hold accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'booking_hold_expired' THEN RAISE;END IF;END;
 h:=public.guest_booking_hold(token,held,payload-'hold_id');q:=public.guest_booking_quote(token,payload);
 PERFORM public.guest_booking_create(token,aid,q->>'version',payload);
 PERFORM public.guest_booking_create(token,aid,q->>'version',payload);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND customer_id=guest_owner AND pet_id=guest_pet AND staff_id=worker AND appointment_status='confirmed') THEN RAISE EXCEPTION 'guest assignment incorrect';END IF;
 IF EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=aid) THEN RAISE EXCEPTION 'unexpected deposit';END IF;
 readback:=public.guest_booking_receipt(token,aid);
 IF readback->>'created_at' IS NULL OR (readback->>'created_at')::timestamptz IS DISTINCT FROM (SELECT created_at FROM public.appointment WHERE id=aid) THEN RAISE EXCEPTION 'demo link creation date mismatch';END IF;
 IF readback->>'status'<>'confirmed' THEN RAISE EXCEPTION 'receipt status wrong';END IF;
 BEGIN PERFORM public.guest_booking_receipt(repeat('d',64),aid);RAISE EXCEPTION 'foreign receipt accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');
 await db.query('ROLLBACK TO SAVEPOINT fixtures');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS custom breed create/edit/context, guest hold 15 minutes, member/guest conflict, expiry, confirmed staff/pet, idempotency, zero payment and private receipt. Fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;});
