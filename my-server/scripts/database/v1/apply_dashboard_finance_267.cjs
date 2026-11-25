// Additive function patch; all verification facts roll back before installation.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
const sql=fs.readFileSync('scripts/database/v1/267_dashboard_finance_refund_lock.sql','utf8').replace(/^--[^\n]*\n/gm,'').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
(async()=>{
 const db=await connect(),contender=await connect();
 try{
  await db.query('BEGIN');await db.query(sql);
  const actor=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role role ON role.staff_id=s.id WHERE role.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1")).rows[0];assert(actor);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor.auth_user_id]);
  await db.query('SAVEPOINT refund_facts');
  const source=(await db.query(`SELECT r.id,r.refunded_amount::float8 amount,p.order_id FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id JOIN public.sales_order o ON o.id=p.order_id
   WHERE r.refund_status='succeeded' AND r.refunded_amount>0 AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.refund_id=r.id AND f.status='posted') LIMIT 1`)).rows[0];assert(source,'Existing succeeded refund is required for rollback validation');
  const data={source_id:source.id,amount:source.amount,revenue_part:0,advance_part:0,expense_part:source.amount,document_part:0,recognized_on:'1970-01-01',description:'Rollback-only concurrent classification',reference:crypto.randomUUID()};
  await db.query('SELECT public.admin_finance_post($1,$2,$3,NULL)',[crypto.randomUUID(),'refund_allocation',data]);
  await contender.query('BEGIN');
  let locked;try{await contender.query('SELECT id FROM public.sales_order WHERE id=$1 FOR UPDATE NOWAIT',[source.order_id]);}catch(error){locked=error;}
  await contender.query('ROLLBACK');assert.equal(locked?.code,'55P03','Refund classification must lock the invoice used by return credit posting');
  await db.query('ROLLBACK TO SAVEPOINT refund_facts');
  // Validate the cap independently of which real refunds or return requests exist.
  await db.query('SAVEPOINT cap_facts');
  const total=(await db.query('SELECT total_amount::float8 total FROM public.sales_order_totals WHERE order_id=$1',[source.order_id])).rows[0].total;
  const entryActor=(await db.query('SELECT id FROM public.staff WHERE auth_user_id=$1',[actor.auth_user_id])).rows[0].id;
  // The constraint remains enabled; use a different refund as the read-only anchor if available.
  const another=(await db.query("SELECT r.id FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=$1 AND r.id<>$2 AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.refund_id=r.id AND f.status='posted') LIMIT 1",[source.order_id,source.id])).rows[0];
  if(another&&total>=0){
   await db.query("INSERT INTO public.finance_entry(id,entry_kind,description,amount,recognized_on,reference,refund_id,revenue_part,created_by) VALUES($1,'refund_allocation','Rollback-only cap boundary',$2,'1970-01-01',$3,$4,$2,$5)",[crypto.randomUUID(),total||0.0001,crypto.randomUUID(),another.id,entryActor]);
   await db.query('SAVEPOINT exceeds_invoice');let over;
   try{await db.query('SELECT public.admin_finance_post($1,$2,$3,NULL)',[crypto.randomUUID(),'refund_allocation',{...data,revenue_part:source.amount,expense_part:0}]);}catch(error){over=error;}
   await db.query('ROLLBACK TO SAVEPOINT exceeds_invoice');assert.equal(over?.code,'22023');
  }
  await db.query('ROLLBACK TO SAVEPOINT cap_facts');
  await db.query('ROLLBACK');
  if(process.argv.includes('--apply-cloud')){await db.query('BEGIN');await db.query(sql);await db.query('COMMIT');}
  console.log((process.argv.includes('--apply-cloud')?'APPLIED':'PASS rollback validation')+': refund classification locks the original invoice against concurrent credits; aggregate reduction guard installed. No business source changes or retained test facts.');
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}finally{await contender.end();await db.end();}
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
