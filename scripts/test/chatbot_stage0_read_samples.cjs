// Three bounded read-only SQL samples; not an authenticated HTTP or load benchmark.
const fs=require('node:fs');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud')){console.log('No connection: pass --cloud for three read-only samples.');process.exit(0);}
(async()=>{
 let db;const report={capturedAt:new Date().toISOString(),scope:'SQL authenticated role with existing active ADMIN claims; read-only; no HTTP JWT, AI, writes or Logs',samples:[]};
 try{
  db=await connect();await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await db.query("SET LOCAL statement_timeout='5s'");await db.query("SET LOCAL lock_timeout='1s'");
  const actor=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id JOIN auth.users u ON u.id=s.auth_user_id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now()) ORDER BY s.id LIMIT 1")).rows[0];
  if(!actor)throw Error('no_eligible_actor');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');
  const date=(await db.query("SELECT to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS sample_date")).rows[0].sample_date;
  const filters={start_at:date+'T00:00:00+07:00',end_at:new Date(Date.parse(date+'T00:00:00+07:00')+86400000).toISOString(),category:'grooming_spa',status:'confirmed'};
  const cases=[
   {intent:'inventory.low_stock',filters:{},oracle:"SELECT count(*)::int total FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id WHERE p.status='active' AND v.status='active' AND NOT v.catalog_retired AND i.quantity_in_stock<i.minimum_stock",args:[]},
   {intent:'appointment.list',filters,oracle:"SELECT count(DISTINCT a.id)::int total FROM public.appointment a JOIN public.appointment_item i ON i.appointment_id=a.id JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE a.scheduled_start_at>=$1::timestamptz AND a.scheduled_start_at<$2::timestamptz AND a.appointment_status='confirmed' AND i.status<>'cancelled' AND c.category_code='grooming_spa'",args:[filters.start_at,filters.end_at]},
   {intent:'ticket.open',filters:{},oracle:"SELECT count(*)::int total FROM public.support_ticket WHERE status NOT IN ('completed','resolved','closed','rejected','cancelled')",args:[]}
  ];
  for(const sample of cases){
   const started=performance.now();const r=await db.query('SELECT public.admin_copilot_facts($1,$2::jsonb) data',[sample.intent,JSON.stringify(sample.filters)]);const ms=performance.now()-started;
   const data=r.rows[0].data,oracle=(await db.query(sample.oracle,sample.args)).rows[0].total;
   report.samples.push({intent:sample.intent,filters:sample.filters,total:Number(data.total),rows:data.items?.length,sourceBytes:Buffer.byteLength(JSON.stringify(data)),roundTripMs:Math.round(ms*100)/100,oracleTotal:oracle,matchesOracle:Number(data.total)===oracle});
  }
  report.status=report.samples.every(s=>s.matchesOracle)?'PASS':'FAIL';await db.query('ROLLBACK');
 }catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});report.status='UNAVAILABLE';report.error={code:e.code||'unknown',name:e.name,...(e.code==='42601'?{syntax:e.message,position:e.position}:{})};}
 finally{if(db)await db.end();}
 fs.mkdirSync('docs/chatbot/stage0-2026-10-28',{recursive:true});fs.writeFileSync('docs/chatbot/stage0-2026-10-28/read-samples.txt',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;
})();
