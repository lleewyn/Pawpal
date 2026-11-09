const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 console.log('Levels:',(await db.query('SELECT id,level_code,level_name,rank_order,is_active FROM public.staff_level ORDER BY rank_order')).rows);
 console.log('Staff:',(await db.query(`SELECT s.id,s.full_name,s.job_title,s.specialization,s.staff_level_id,s.service_locked,
 a.assessment_type,a.score,a.result,a.note FROM public.staff s
 LEFT JOIN LATERAL(SELECT assessment_type,score,result,note FROM public.staff_assessment WHERE staff_id=s.id ORDER BY assessment_date DESC,created_at DESC,id LIMIT 1) a ON true
 WHERE s.employment_status='active' ORDER BY s.full_name`)).rows);
}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code);process.exitCode=1;});
