const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for migration 131.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/131_staff_assignment_eligibility.sql','utf8');await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");
 const signatures=['public.own_booking_availability(jsonb)','pawpal_private.guest_booking_availability(uuid,jsonb)','public.admin_staff_list_page(jsonb,integer)'];
 const definitions=[];for(const sig of signatures)definitions.push((await db.query('SELECT pg_get_functiondef($1::regprocedure) definition',[sig])).rows[0].definition);
 const backup='docs/verification/sync/staff-assignment-131-rollback.sql';if(!fs.existsSync(backup))fs.writeFileSync(backup,'BEGIN;\n'+['staff_schedule','appointment','appointment_item','taxi_trip'].map(table=>'DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.'+table+';').join('\n')+'\nDROP FUNCTION IF EXISTS public.admin_service_staff_candidates();\nDROP FUNCTION IF EXISTS pawpal_private.guard_staff_assignment_eligibility();\n'+definitions.join(';\n')+';\nDROP FUNCTION IF EXISTS pawpal_private.staff_skill_allows_assignment(uuid);\nNOTIFY pgrst,\'reload schema\';\nCOMMIT;\n');
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT (SELECT count(*)=4 FROM pg_trigger WHERE tgname='staff_assignment_eligibility' AND NOT tgisinternal) AS assignment_guards,
 has_function_privilege('authenticated','public.admin_service_staff_candidates()','EXECUTE') AS staff_candidates_available,
 NOT has_function_privilege('anon','public.admin_service_staff_candidates()','EXECUTE') AS anonymous_blocked,
 strpos(pg_get_functiondef('public.own_booking_availability(jsonb)'::regprocedure),'staff_skill_allows_assignment')>0 AS member_availability,
 strpos(pg_get_functiondef('pawpal_private.guest_booking_availability(uuid,jsonb)'::regprocedure),'staff_skill_allows_assignment')>0 AS guest_availability`)).rows[0];assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/staff-assignment-131-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Latest assessment eligibility, service and shift guards, candidate/availability/filter reads; no staff/assessment/booking rows modified'},null,2)+'\n');console.log('APPLIED 131; assignment guards, candidate access and both availability paths verified. No business rows modified.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
