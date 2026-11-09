const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 console.log((await db.query("SELECT pg_get_functiondef('public.admin_service_staff_candidates()'::regprocedure) definition")).rows[0].definition);
 console.log('Staff eligibility counts:',(await db.query(`SELECT count(*) total,count(*) FILTER(WHERE employment_status='active') active,
 count(*) FILTER(WHERE employment_status='active' AND NOT service_locked AND pawpal_private.staff_skill_allows_assignment(id)) assignable,
 count(*) FILTER(WHERE employment_status='active' AND NOT service_locked AND staff_level_id IS NOT NULL) with_level FROM public.staff`)).rows[0]);
 console.log('Affected booking staffing:',(await db.query(`SELECT s.service_code,l.level_name required_level,l.rank_order required_rank,
 (SELECT count(*) FROM public.staff st JOIN public.staff_level sl ON sl.id=st.staff_level_id
 WHERE st.employment_status='active' AND NOT st.service_locked AND pawpal_private.staff_skill_allows_assignment(st.id) AND sl.rank_order>=l.rank_order) level_qualified
 FROM public.appointment a JOIN public.appointment_item i ON i.appointment_id=a.id AND i.is_primary
 JOIN public.service s ON s.id=i.service_id LEFT JOIN public.staff_level l ON l.id=s.staff_level_required_id
 WHERE a.appointment_code=$1`,['BKG-1A4C691C85F94094847D8083F4B6CEC'])).rows);
}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code);process.exitCode=1;});
