const {connect}=require('./service_import_connection.cjs');
const fs=require('node:fs'),path=require('node:path');
const prior=JSON.parse(fs.readFileSync('artifacts/data-cleanup/2026-11-11T02-51-15-423Z/result.private.json','utf8'));
const ids=prior.retainedRoots.filter(r=>r.table==='public.customer').map(r=>r.id);
(async()=>{const db=await connect();try{
 await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='15s'");
 const res=await db.query(`SELECT jsonb_build_object(
 'notice_function',to_regprocedure('public.own_complaint_reply_notices()')::text,
 'notice_read_function',to_regprocedure('public.read_own_complaint_reply_notice(uuid)')::text,
 'notice_table',to_regclass('pawpal_private.complaint_reply_notice')::text,
 'work_actor',to_regprocedure('pawpal_private.work_actor()')::text,
 'notice_functions',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'acl',p.proacl,'definition',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname IN ('own_complaint_reply_notices','read_own_complaint_reply_notice','record_complaint_reply_notice')),
 'notice_columns',(SELECT jsonb_agg(column_name) FROM information_schema.columns WHERE table_schema='pawpal_private' AND table_name='complaint_reply_notice'),
 'customers',(SELECT jsonb_agg(jsonb_build_object('id',c.id,'code',c.customer_code,'status',c.customer_status,'points',(SELECT sum(points) FROM public.paw_point_transaction WHERE customer_id=c.id),'posted_payments',(SELECT count(*) FROM public.payment WHERE customer_id=c.id AND transaction_status='succeeded'))) FROM public.customer c WHERE c.id=ANY($1::uuid[])),
 'missing_profiles',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.id,c.customer_code,c.auth_user_id IS NOT NULL AS login,coalesce(c.unverified_contact_phone,'')<>'' AS unverified_phone,(SELECT count(*) FROM public.customer_phone p WHERE p.customer_id=c.id) AS phones,(SELECT count(*) FROM public.appointment a WHERE a.customer_id=c.id) AS appointments,(SELECT count(*) FROM public.sales_order o WHERE o.customer_id=c.id) AS orders FROM public.customer c WHERE NOT EXISTS(SELECT 1 FROM public.customer_profile p WHERE p.customer_id=c.id) ORDER BY c.id LIMIT 30)x),
 'old_appointments',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT a.id,a.appointment_code,a.appointment_status,a.scheduled_end_at,a.check_in_time,a.check_out_time,(SELECT count(*) FROM public.payment p WHERE p.appointment_id=a.id AND transaction_status='succeeded') AS paid,(SELECT count(*) FROM public.appointment_item i WHERE i.appointment_id=a.id AND status NOT IN ('completed','cancelled')) AS open_items FROM public.appointment a WHERE a.appointment_status IN ('pending','confirmed','checked_in','in_progress') AND a.scheduled_end_at<now()-interval '1 day' ORDER BY a.scheduled_end_at LIMIT 60)x),
 'posted_test_payment',(SELECT jsonb_agg(jsonb_build_object('id',id,'code',payment_code,'amount',amount,'order_id',order_id,'status',transaction_status)) FROM public.payment WHERE customer_id=ANY($1::uuid[]) AND transaction_status='succeeded')
 ) AS report`,[ids]);
 await db.query('ROLLBACK');const r=res.rows[0].report;
 const folder=path.resolve('artifacts/data-cleanup/remaining-repair');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'diagnosis.private.json'),JSON.stringify(r,null,2));
 console.log(JSON.stringify(r,null,2));
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
