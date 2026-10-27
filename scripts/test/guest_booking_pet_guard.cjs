const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for inactive pet/owner field guards in rollback.');process.exit(0);}
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
 await db.query(`DO $$ DECLARE token_hash text:=repeat(replace(gen_random_uuid()::text,'-',''),2);pet uuid:=gen_random_uuid();breed uuid;details jsonb;rejected boolean;
 BEGIN
  SELECT id INTO breed FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1;
  IF breed IS NULL THEN RAISE EXCEPTION 'breed_fixture_missing';END IF;
  PERFORM public.guest_commerce_save_pet(token_hash,now()+interval '1 day',pet,'0950000001','Booking pet guard',jsonb_build_object('name','Booking pet guard','breedId',breed,'weight',5));
  UPDATE public.pet_profile SET status='inactive' WHERE id=pet;
  details:=jsonb_build_object('pet_id',pet,'service_id',gen_random_uuid(),'scheduled_start_at',now()+interval '14 days');
  rejected:=false;BEGIN
   PERFORM public.guest_booking_quote(token_hash,details);
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'inactive_pet_accepted';END IF;
  rejected:=false;BEGIN
   PERFORM public.guest_booking_quote(token_hash,details||jsonb_build_object('customer_id',gen_random_uuid()));
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'explicit_owner_field_accepted';END IF;
 END $$`);
 await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/guest-booking-pet-guard.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks:['Inactive owned pet rejected before quote','Explicit owner field rejected by RPC itself'],scope:'Installed SQL RPC synthetic pet/contact/session fixture in rollback; no committed data or actual catalog/config changes'},null,2)+'\n');console.log('PASS inactive pet and forged-owner SQL guards; fixtures rolled back.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
