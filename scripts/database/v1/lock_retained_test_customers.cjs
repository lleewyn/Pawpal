// Stop test profiles from participating in commerce without changing posted points or money.
const fs=require('node:fs'),path=require('node:path');
const {connect}=require('./service_import_connection.cjs');
const source=JSON.parse(fs.readFileSync('artifacts/data-cleanup/2026-11-11T02-51-15-423Z/retained-inspection.private.json','utf8'));
const expected=new Map(source.customers.map(row=>[row.id,row.full_name]));
const apply=process.argv[2]==='apply';
(async()=>{const db=await connect();try{
 await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');await db.query("SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='5s'");
 const rows=(await db.query("SELECT to_jsonb(c)||jsonb_build_object('full_name',p.full_name) AS row FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE c.id=ANY($1::uuid[]) FOR UPDATE OF c",[[...expected.keys()]])).rows.map(record=>record.row);
 if(rows.length!==6||rows.some(row=>row.full_name!==expected.get(row.id)||!['active','locked'].includes(row.customer_status)))throw Error('Reviewed test identities changed; nothing locked');
 const protectedSnapshot=async()=> (await db.query(`SELECT jsonb_build_object(
 'points',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.paw_point_transaction t),
 'payments',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.payment t),
 'others',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.customer t WHERE NOT(id=ANY($1::uuid[])))) AS data`,[[...expected.keys()]])).rows[0].data;
 const before=await protectedSnapshot();
 const admin=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id JOIN auth.users u ON u.id=s.auth_user_id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true) LIMIT 1")).rows[0];
 if(!admin)throw Error('Valid admin needed for audited status action');
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[admin.auth_user_id]);
 const folder=path.join('D:/Aboutme/Pawpal-infra/supabase-local/backups','test-profile-lock-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'before.private.json'),JSON.stringify({rows,protectedSnapshot:before},null,2));
 let count=0;
 for(const row of rows)if(row.customer_status==='active'){
   await db.query("SELECT public.set_customer_status($1,$2,'locked')",[row.id,row.updated_at]);count++;
 }
 if(JSON.stringify(before)!==JSON.stringify(await protectedSnapshot()))throw Error('Money, points or other customer rows changed');
 const after=(await db.query('SELECT customer_status,count(*)::int FROM public.customer WHERE id=ANY($1::uuid[]) GROUP BY customer_status',[[...expected.keys()]])).rows;
 if(after.length!==1||after[0].customer_status!=='locked'||after[0].count!==6)throw Error('Expected six locked profiles');
 await db.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({applied:apply,locked:count,allSixLocked:apply,pointsAndPaymentsUnchanged:true,auditedThroughExistingRpc:true,backup:folder}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
