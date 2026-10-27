// Short post-install guard probe. All synthetic rows/side effects are rolled back.
const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for synthetic transaction rollback checks.');process.exit(0);}
(async()=>{const db=await connect();try{
 await db.query("BEGIN; SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='2s'");
 await db.query(`DO $$
 DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); pet uuid:=gen_random_uuid(); breed uuid;
  session_id uuid:=gen_random_uuid(); general_id uuid:=gen_random_uuid(); booking uuid:=gen_random_uuid(); rejected boolean;
 BEGIN
  INSERT INTO public.customer(id,customer_code,unverified_contact_phone) VALUES
   (a,'G112-PROBE-'||a,'0950000001'),(b,'G112-PROBE-'||b,'0950000001');
  INSERT INTO public.guest_session(id,token_hash,expires_at,purpose,customer_id)
   VALUES(session_id,repeat(replace(session_id::text,'-',''),2),now()+interval '1 day','commerce',a);
  INSERT INTO public.guest_session(id,token_hash,expires_at)
   VALUES(general_id,repeat(replace(general_id::text,'-',''),2),now()+interval '30 days');
  UPDATE public.customer SET unverified_contact_phone='0950000002' WHERE id=a;
  IF NOT EXISTS(SELECT 1 FROM public.guest_session WHERE id=session_id AND revoked_at IS NOT NULL) THEN RAISE EXCEPTION 'contact_change_did_not_revoke'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.guest_session WHERE id=general_id AND purpose='general' AND revoked_at IS NULL AND customer_id IS NULL) THEN RAISE EXCEPTION 'general_session_changed'; END IF;
  rejected:=false; BEGIN
   UPDATE public.guest_session SET revoked_at=NULL WHERE id=session_id;
  EXCEPTION WHEN check_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'revoked_token_reactivated'; END IF;
  SELECT id INTO breed FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1;
  IF breed IS NULL THEN RAISE EXCEPTION 'breed_fixture_requirement_missing'; END IF;
  INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,gender)
   VALUES(pet,a,'G112-PET-'||pet,'Schema guard probe',breed,'nam');
  rejected:=false; BEGIN
   INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at)
    VALUES(booking,'G112-BOOK-'||booking,b,pet,now()+interval '1 day',now()+interval '25 hours');
  EXCEPTION WHEN check_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'cross_owner_booking_accepted'; END IF;
  INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at)
   VALUES(booking,'G112-BOOK-'||booking,a,pet,now()+interval '1 day',now()+interval '25 hours');
  rejected:=false; BEGIN
   UPDATE public.appointment SET customer_id=b WHERE id=booking;
  EXCEPTION WHEN check_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'booking_owner_change_accepted'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=booking AND customer_id=a AND pet_id=pet) THEN RAISE EXCEPTION 'correct_booking_links_not_preserved'; END IF;
 END $$`);
 await db.query('ROLLBACK');
 const checks=['Self-declared contact change revokes bound commerce token','General chat/support session stays unchanged','Revoked token cannot be reactivated','Booking INSERT rejects pet belonging to another customer','Booking UPDATE rejects owner mismatch','Correct customer/pet booking relation preserved'];
 fs.writeFileSync('docs/verification/sync/guest-commerce-guards-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks,scope:'Synthetic rows only, one short SQL DO block, transaction rollback; no committed fixtures, no real user mutation or HTTP/UI acceptance'},null,2)+'\n');
 console.log('PASS',checks.length,'installed guard checks; synthetic data rolled back.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
