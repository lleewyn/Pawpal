// Focused follow-up: read-only; no Supabase Logs, credentials, tokens, or password hashes queried.
const fs=require('node:fs'),path=require('node:path');
const {connect}=require('./service_import_connection.cjs');
const folder=path.resolve('artifacts/data-cleanup/2026-11-11T02-51-15-423Z');
const result=JSON.parse(fs.readFileSync(path.join(folder,'result.private.json'),'utf8'));
const staffIds=['48f9d4a5-acd9-4711-8891-dd57bf4433f7','490fec43-0971-46f1-a193-1420a742c1ae'];
const ids=table=>result.retainedRoots.filter(row=>row.table==='public.'+table).map(row=>row.id);
const customerIds=ids('customer');
(async()=>{
 const client=await connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='20s'");
  const read=async(sql,params=[]) => (await client.query(sql,params)).rows;
  const customers=await read(`SELECT c.id,c.customer_code,c.customer_status,p.full_name,c.auth_user_id IS NOT NULL AS has_login,
    (SELECT count(*)::int FROM public.pet_profile t WHERE t.customer_id=c.id) AS pets,
    (SELECT count(*)::int FROM public.appointment t WHERE t.customer_id=c.id) AS appointments,
    (SELECT count(*)::int FROM public.sales_order t WHERE t.customer_id=c.id) AS orders,
    (SELECT count(*)::int FROM public.payment t WHERE t.customer_id=c.id) AS payments,
    (SELECT count(*)::int FROM public.paw_point_transaction t WHERE t.customer_id=c.id) AS point_entries,
    (SELECT coalesce(sum(points),0)::text FROM public.paw_point_transaction t WHERE t.customer_id=c.id) AS point_balance
    FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id WHERE c.id=ANY($1::uuid[]) ORDER BY c.id`,[customerIds]);
  const points=await read(`SELECT id,customer_id,points,description,payment_id,review_id,refund_transaction_id,customer_voucher_id,voucher_redemption_id
    FROM public.paw_point_transaction WHERE customer_id=ANY($1::uuid[]) ORDER BY customer_id,sequence_no`,[customerIds]);
  const orders=await read(`SELECT o.id,o.order_code,o.customer_id,o.order_status,
    (SELECT count(*)::int FROM public.voucher_redemption v WHERE v.order_id=o.id) AS voucher_uses,
    (SELECT count(*)::int FROM public.payment p WHERE p.order_id=o.id AND p.transaction_status='succeeded') AS posted_payments,
    (SELECT count(*)::int FROM public.media_upload_session m WHERE m.sales_order_id=o.id) AS media_sessions
    FROM public.sales_order o WHERE o.customer_id=ANY($1::uuid[]) ORDER BY o.id`,[customerIds]);
  const appointments=await read(`SELECT a.id,a.appointment_code,a.customer_id,a.pet_id,a.appointment_status,a.scheduled_start_at,
    (SELECT count(*)::int FROM public.appointment_record r WHERE r.appointment_id=a.id AND r.customer_confirmation_status='confirmed') AS signed_records,
    (SELECT count(*)::int FROM public.payment p WHERE p.appointment_id=a.id AND p.transaction_status='succeeded') AS posted_payments,
    (SELECT count(*)::int FROM public.voucher_redemption v WHERE v.appointment_id=a.id) AS voucher_uses,
    (SELECT count(*)::int FROM public.media_upload_session m WHERE m.appointment_id=a.id) AS media_sessions
    FROM public.appointment a WHERE a.customer_id=ANY($1::uuid[]) OR a.id=ANY($2::uuid[]) ORDER BY a.id`,[customerIds,ids('appointment')]);
  const media=await read(`SELECT m.id,m.appointment_id,m.pet_id,m.sales_order_id,m.state,m.purpose,m.created_at,m.expires_at,
    (SELECT count(*)::int FROM public.media_asset a WHERE a.session_id=m.id) AS assets
    FROM public.media_upload_session m WHERE m.appointment_id=ANY($1::uuid[]) OR m.pet_id=ANY($2::uuid[]) OR m.sales_order_id=ANY($3::uuid[]) ORDER BY m.id`,[appointments.map(r=>r.id),ids('pet_profile'),orders.map(r=>r.id)]);
  const assets=media.length?await read(`SELECT a.id,a.session_id,a.status,
    (SELECT count(*)::int FROM public.care_log_media x WHERE x.media_asset_id=a.id) AS care_refs,
    (SELECT count(*)::int FROM public.review_media x WHERE x.media_asset_id=a.id) AS review_refs,
    (SELECT count(*)::int FROM public.product_media x WHERE x.media_asset_id=a.id) AS product_refs,
    (SELECT count(*)::int FROM public.service_image x WHERE x.media_asset_id=a.id) AS service_refs
    FROM public.media_asset a WHERE a.session_id=ANY($1::uuid[]) ORDER BY a.id`,[media.map(r=>r.id)]):[];
  const vouchers=await read(`SELECT v.id,v.customer_id,v.voucher_id,v.voucher_status,
    (SELECT count(*)::int FROM public.voucher_redemption r WHERE r.customer_voucher_id=v.id) AS redemptions,
    (SELECT count(*)::int FROM public.paw_point_transaction p WHERE p.customer_voucher_id=v.id) AS point_entries
    FROM public.customer_voucher v WHERE v.customer_id=ANY($1::uuid[]) ORDER BY v.id`,[customerIds]);
  const staff=await read(`SELECT s.id,s.full_name,s.employment_status,s.auth_user_id,
    to_jsonb(u)->>'last_sign_in_at' AS last_sign_in_at,to_jsonb(u)->>'banned_until' AS banned_until,
    to_jsonb(u)->>'deleted_at' AS auth_deleted_at,
    (SELECT jsonb_agg(r.role_code ORDER BY r.role_code) FROM public.staff_role r WHERE r.staff_id=s.id) AS roles,
    (SELECT count(*)::int FROM public.staff_schedule t WHERE t.staff_id=s.id) AS shifts,
    (SELECT count(*)::int FROM public.appointment t WHERE t.staff_id=s.id OR t.requested_staff_id=s.id OR t.proposal_staff_id=s.id) AS appointment_refs,
    (SELECT count(*)::int FROM public.appointment_item t WHERE t.staff_id=s.id) AS service_line_refs,
    (SELECT count(*)::int FROM public.care_log t WHERE t.recorded_by=s.id) AS care_log_refs,
    (SELECT count(*)::int FROM public.inventory_transaction t WHERE t.staff_id=s.id) AS inventory_ledger_refs,
    (SELECT count(*)::int FROM public.support_ticket t WHERE t.assigned_staff_id=s.id OR t.resolved_by=s.id) AS ticket_refs
    FROM public.staff s LEFT JOIN auth.users u ON u.id=s.auth_user_id WHERE s.id=ANY($1::uuid[]) ORDER BY s.id`,[staffIds]);
  const guardFunctions=await read(`SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pawpal_private' AND p.proname IN ('immutable_event','protect_payment_delete','protect_signed_record','release_pet_avatar_media','release_customer_vaccine_media','release_media_reference')`);
  const functionNames=await read(`SELECT n.nspname AS schema,p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','pawpal_private') AND p.proname ~ '(delete|remove|release|cancel|clean|retire|revoke)' ORDER BY 1,2`);
  // Count exact-key references only. No event text, credentials or token values are retrieved.
  const inbound=await read(`SELECT pn.nspname||'.'||pc.relname AS parent,cn.nspname AS child_schema,cc.relname AS child,ca.attname AS column_name
    FROM pg_constraint con JOIN pg_class cc ON cc.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=cc.relnamespace
    JOIN pg_class pc ON pc.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=pc.relnamespace
    JOIN pg_attribute ca ON ca.attrelid=con.conrelid AND ca.attnum=con.conkey[1]
    WHERE con.contype='f' AND cardinality(con.conkey)=1 AND
    ((pn.nspname='public' AND pc.relname IN ('staff','media_asset','media_upload_session')) OR (pn.nspname='auth' AND pc.relname='users'))
    ORDER BY 1,2,3,4`);
  const targetIds={ 'public.staff':staffIds, 'auth.users':staff.map(r=>r.auth_user_id).filter(Boolean),
    'public.media_asset':assets.map(r=>r.id), 'public.media_upload_session':media.map(r=>r.id) };
  const referenceCounts=[];
  const quote=value=>'"'+value.replace(/"/g,'""')+'"';
  for(const fk of inbound){
    const targets=targetIds[fk.parent];if(!targets.length)continue;
    const matches=await read(`SELECT ${quote(fk.column_name)}::text AS parent_id,count(*)::int AS refs FROM ${quote(fk.child_schema)}.${quote(fk.child)} WHERE ${quote(fk.column_name)}::text=ANY($1::text[]) GROUP BY ${quote(fk.column_name)}`,[targets]);
    if(matches.length)referenceCounts.push({...fk,matches});
  }
  await client.query('ROLLBACK');
  const report={checkedAt:new Date().toISOString(),customers,points,orders,appointments,media,assets,vouchers,staff,guardFunctions,functionNames,referenceCounts};
  const target=path.join(folder,'retained-inspection.private.json');
  fs.writeFileSync(target,JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,guardFunctions:guardFunctions.map(r=>r.proname),privateReport:target},null,2));
 }finally{await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
