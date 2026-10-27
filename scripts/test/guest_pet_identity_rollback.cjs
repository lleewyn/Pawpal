const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for same-name/rejected-first-write rollback checks.');process.exit(0);}
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
 await db.query(`DO $$ DECLARE
  one uuid:=gen_random_uuid();two uuid:=gen_random_uuid();breed uuid;owner_id uuid;hash_one text:=repeat(replace(gen_random_uuid()::text,'-',''),2);
  hash_two text:=repeat(replace(gen_random_uuid()::text,'-',''),2);details jsonb;before_count integer;rejected boolean:=false;
 BEGIN
  SELECT id INTO breed FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1;
  IF breed IS NULL THEN RAISE EXCEPTION 'breed_fixture_missing';END IF;
  details:=jsonb_build_object('name','Same name probe','breedId',breed);
  PERFORM public.guest_commerce_save_pet(hash_one,now()+interval '1 day',one,'0950000001','Guest identity probe',details);
  PERFORM public.guest_commerce_save_pet(hash_one,now()+interval '1 day',two,'0950000001','Guest identity probe',details);
  IF (SELECT count(*) FROM public.pet_profile WHERE id IN(one,two))<>2 OR
   (SELECT count(DISTINCT customer_id) FROM public.pet_profile WHERE id IN(one,two))<>1 THEN
   RAISE EXCEPTION 'same_named_pets_merged';END IF;
  SELECT customer_id INTO owner_id FROM public.pet_profile WHERE id=one;
  SELECT count(*) INTO before_count FROM public.customer;
  BEGIN
   PERFORM public.guest_commerce_save_pet(hash_two,now()+interval '1 day',one,'0950000001','Another identity probe',details);
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
  IF NOT rejected OR (SELECT count(*) FROM public.customer)<>before_count OR
   EXISTS(SELECT 1 FROM public.guest_session WHERE token_hash=hash_two) THEN
   RAISE EXCEPTION 'rejected_first_write_left_customer_or_session';END IF;
  IF (SELECT count(*) FROM public.customer_phone WHERE customer_id=owner_id)<>0 THEN
   RAISE EXCEPTION 'guest_claimed_canonical_primary_phone';END IF;
 END $$`);
 await db.query('ROLLBACK');
 fs.writeFileSync('docs/verification/sync/guest-pet-identity-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks:['Same-name pets retain two distinct Pet IDs under one owner','First write using foreign Pet ID rejects and rolls back newly attempted customer/session','Self-declared guest contact never claims primary phone'],scope:'Installed RPC SQL with synthetic fixtures, transaction rollback; no HTTP/Auth/UI or concurrency acceptance'},null,2)+'\n');
 console.log('PASS 3 identity/atomicity checks; no committed fixtures.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
