const fs=require('node:fs'),path=require('node:path');
const {connect}=require('./service_import_connection.cjs');
const mode=process.argv[2]||'inspect';
(async()=>{const db=await connect();try{
 await db.query(mode==='inspect'?'BEGIN READ ONLY':'BEGIN');await db.query("SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='5s'");
 const shape=(await db.query(`SELECT to_regclass('pawpal_private.complaint_reply_notice')::text AS notices,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_ticket' AND column_name='customer_followup_message_id') AS followup_column,
 to_regprocedure('public.own_complaint_reply_notices()')::text AS reader,
 to_regprocedure('public.read_own_complaint_reply_notice(uuid)')::text AS mark_reader`)).rows[0];
 if(mode==='inspect'){await db.query('ROLLBACK');console.log(JSON.stringify(shape));return;}
 if(mode!=='apply'||shape.notices||shape.reader||shape.mark_reader)throw Error('Unexpected notification schema; no changes applied');
 const folder=path.join('D:/Aboutme/Pawpal-infra/supabase-local/backups','notice-repair-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'before.private.json'),JSON.stringify(shape));
 const snapshot=async()=> (await db.query(`SELECT jsonb_object_agg(name,digest) AS snapshot FROM (
 SELECT 'customer' AS name,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS digest FROM public.customer t
 UNION ALL SELECT 'points',md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.paw_point_transaction t
 UNION ALL SELECT 'payment',md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.payment t
 UNION ALL SELECT 'ticket',md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.support_ticket t
 UNION ALL SELECT 'messages',md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.support_ticket_message t
 )s`)).rows[0].snapshot;
 const before=await snapshot();
 const source=fs.readFileSync(path.join(__dirname,'repair_complaint_notices.sql'),'utf8');
 await db.query(source);
 // The UI also understands kind; add only the empty projection field, no historic notices.
 await db.query(`CREATE OR REPLACE FUNCTION public.own_complaint_reply_notices() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 DECLARE actor uuid:=pawpal_private.work_actor(); BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'staff_required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('unread',(SELECT count(*) FROM pawpal_private.complaint_reply_notice WHERE staff_id=actor AND read_at IS NULL),
 'items',coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY (n.read_at IS NOT NULL),n.created_at DESC,n.message_id) FROM
 (SELECT r.message_id,r.created_at,r.read_at,r.kind,t.id AS ticket_id,t.ticket_code FROM pawpal_private.complaint_reply_notice r
 JOIN public.support_ticket_message m ON m.id=r.message_id JOIN public.support_ticket t ON t.id=m.ticket_id
 WHERE r.staff_id=actor ORDER BY (r.read_at IS NOT NULL),r.created_at DESC,r.message_id LIMIT 10)n),'[]'::jsonb)); END $$`);
 if(JSON.stringify(before)!==JSON.stringify(await snapshot()))throw Error('Business rows changed; rollback');
 const admin=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password LIMIT 1")).rows[0];
 if(!admin)throw Error('No real admin identity for read-only verification');
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[admin.auth_user_id]);
 const notice=(await db.query('SELECT public.own_complaint_reply_notices() AS result')).rows[0].result;
 if(notice.unread!==0||notice.items.length)throw Error('Unexpected initial notice rows');
 await db.query('NOTIFY pgrst,\'reload schema\'');await db.query('COMMIT');
 console.log(JSON.stringify({repaired:true,businessRowsUnchanged:true,historicalNoticesInserted:0,noticeResult:notice,backup:folder}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
