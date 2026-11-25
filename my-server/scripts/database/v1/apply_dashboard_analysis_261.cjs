// Default: validate the additive evidence RPC and roll back. No source records are written.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { connect } = require('./service_import_connection.cjs');
(async () => {
 const db = await connect();
 try {
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='20s'");
  const sql = fs.readFileSync('scripts/database/v1/261_dashboard_analysis_evidence.sql','utf8').replace(/^--[^\n]*\n/gm,'').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
  await db.query(sql);
  const actor=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1")).rows[0];
  assert(actor);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor.auth_user_id]);
  await db.query('SET LOCAL ROLE authenticated');
  const period=(await db.query("SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-29 from_day,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date to_day")).rows[0];
  // One statement shares an identical cutoff and snapshot for all totals and evidence pages.
  const reports=(await db.query(`SELECT public.admin_dashboard_business_analysis($1,$2) analysis,
   (SELECT jsonb_object_agg(kind,public.admin_dashboard_analysis_page($1,$2,kind,1)) FROM unnest(ARRAY['customers','first_observed','returned_from_before','repeated_in_period','orders_created','orders_cancelled','appointments_created','appointments_cancelled','appointments_no_show']) kind) pages`,[period.from_day,period.to_day])).rows[0];
  const { analysis, pages }=reports;
  const independent=(await db.query(`WITH completed AS (
   SELECT customer_id,delivered_at at FROM public.sales_order WHERE order_status IN('completed','delivered') AND delivered_at<$2
   UNION ALL SELECT customer_id,check_out_time FROM public.appointment WHERE appointment_status='completed' AND check_out_time<$2
  ),groups AS(
   SELECT customer_id,count(*) FILTER(WHERE at>=$1) in_period,min(at)<$1 had_before FROM completed WHERE customer_id IS NOT NULL GROUP BY customer_id
  ) SELECT count(*)::int eligible,count(*) FILTER(WHERE NOT had_before)::int first_observed,count(*) FILTER(WHERE had_before)::int returned_from_before,count(*) FILTER(WHERE in_period>=2)::int repeated_in_period FROM groups WHERE in_period>0`,[analysis.from,analysis.to])).rows[0];
  assert.deepEqual(analysis.customers,independent,'Cohorts match an independent source union without payment or line joins');
  const expected={customers:analysis.customers.eligible,...analysis.customers,...analysis.outcomes};
  for(const [kind,page] of Object.entries(pages)) {
   assert.equal(page.total,expected[kind],kind+' evidence count matches its summary');
   assert(page.rows.length<=10);
   assert.equal(new Set(page.rows.map(row=>row.id)).size,page.rows.length,'No duplicate customer or source record');
   assert.equal(page.from,analysis.from);assert.equal(page.to,analysis.to);
   if(kind==='first_observed') assert(page.rows.every(row=>!row.had_before));
   if(kind==='returned_from_before') assert(page.rows.every(row=>row.had_before));
   if(kind==='repeated_in_period') assert(page.rows.every(row=>row.transaction_count>=2));
   assert(page.rows.every(row=>['customer','order','appointment'].includes(row.target_kind)));
  }
  const last=(await db.query('SELECT public.admin_dashboard_analysis_page($1,$2,$3,100000) p',[period.from_day,period.to_day,'customers'])).rows[0].p;
  assert.equal(last.page,Math.max(1,Math.ceil(last.total/10)));assert(last.rows.length<=10);
  async function rejected(query,params,code) {
   await db.query('SAVEPOINT invalid_evidence');let caught;
   try {await db.query(query,params);} catch(error) {caught=error;}
   await db.query('ROLLBACK TO SAVEPOINT invalid_evidence');await db.query('RELEASE SAVEPOINT invalid_evidence');assert.equal(caught?.code,code);
  }
  await rejected('SELECT public.admin_dashboard_analysis_page($1,$2,NULL)',[period.from_day,period.to_day],'22023');
  await rejected("SELECT public.admin_dashboard_analysis_page(current_date,current_date+100,'customers')",[],'22023');
  await db.query("SELECT set_config('request.jwt.claim.sub','',true)");
  await rejected("SELECT public.admin_dashboard_analysis_page(current_date,current_date,'customers')",[],'42501');
  await db.query('SET LOCAL ROLE anon');
  await rejected("SELECT public.admin_dashboard_analysis_page(current_date,current_date,'orders_created')",[],'42501');
  await db.query('RESET ROLE');
  await db.query(sql); // Idempotent function installation; no baseline or source mutations.
  await db.query(process.argv.includes('--apply-cloud')?'COMMIT':'ROLLBACK');
  console.log((process.argv.includes('--apply-cloud')?'APPLIED':'PASS rollback validation')+': nine evidence groups match summary totals, unique rows, ten-row pages, bounded periods, source links and API role permissions. No source business records changed.');
 } catch(error) {await db.query('ROLLBACK').catch(()=>{});throw error;} finally {await db.end();}
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
