// Explicit generation from current member definitions; never applies SQL.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const signatures=['pawpal_private.customer_new_booking_quote(jsonb)','public.own_booking_availability(jsonb)'];
 const definitions=[];await db.query('BEGIN READ ONLY');
 for(const signature of signatures)definitions.push((await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[signature])).rows[0].value.replaceAll('\r\n','\n'));
 await db.query('ROLLBACK');
 const replaceOnce=(value,from,to)=>{assert.equal(value.split(from).length,2,'Unexpected source marker: '+from.slice(0,80));return value.replace(from,to);};
 let [quote,availability]=definitions;
 quote=replaceOnce(quote,'pawpal_private.customer_new_booking_quote(p_details jsonb)','pawpal_private.guest_booking_quote_core(p_owner uuid, p_details jsonb)');
 quote=replaceOnce(quote," SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;\n IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;", " owner_id:=p_owner;\n IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=owner_id AND auth_user_id IS NULL AND customer_status='active' AND unverified_contact_phone IS NOT NULL) THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;");
 quote=replaceOnce(quote,'public.own_booking_availability(p_details)','pawpal_private.guest_booking_availability(p_owner,p_details)');
 availability=replaceOnce(availability,'public.own_booking_availability(p_details jsonb)','pawpal_private.guest_booking_availability(p_owner uuid, p_details jsonb)');
 availability=replaceOnce(availability," cid:=(public.customer_profile_snapshot()->>'id')::uuid;"," cid:=p_owner;\n IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=cid AND auth_user_id IS NULL AND customer_status='active' AND unverified_contact_phone IS NOT NULL) THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;");
 // Price variants can have a different duration from the service default.
 // Both closing-hour and overlap checks must use the same duration as quote.
 assert.equal(availability.split('svc.estimated_duration').length,3);
 availability=availability.replaceAll('svc.estimated_duration',"pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=(p_details->>'pet_id')::uuid),starts)");
 assert.ok(!quote.includes('auth.uid()')&&!availability.includes('customer_profile_snapshot'));
 const file='scripts/database/v1/114_guest_booking.sql',source=fs.readFileSync(file,'utf8');
 const generated=availability.trim()+';\n\n'+quote.trim()+';\nREVOKE ALL ON FUNCTION pawpal_private.guest_booking_quote_core(uuid,jsonb),pawpal_private.guest_booking_availability(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;';
 fs.writeFileSync(file,source.replace(/-- BEGIN GENERATED QUOTE HELPERS[\s\S]*?-- END GENERATED QUOTE HELPERS/,()=> '-- BEGIN GENERATED QUOTE HELPERS\n'+generated+'\n-- END GENERATED QUOTE HELPERS'));
 fs.writeFileSync('docs/verification/sync/guest-booking-source-baseline.txt',JSON.stringify({timestamp:new Date().toISOString(),sources:signatures.map((signature,i)=>({signature,sha256:crypto.createHash('sha256').update(definitions[i]).digest('hex')})),scope:'Read-only member rule definitions copied into new private guest helpers; original member definitions unchanged. Future pricing/availability logic changes must update and retest guest helpers.'},null,2)+'\n');
 console.log('PASS generated private guest quote/availability helpers from two unchanged member definitions.');
}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
