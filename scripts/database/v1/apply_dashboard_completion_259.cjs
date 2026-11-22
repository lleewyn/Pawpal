// Additive Dashboard migration. Default validates in a rollback transaction.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { connect } = require('./service_import_connection.cjs');
const metrics = require('../../../pages/admin/modules/dashboard/subtabs/operations-metrics.js');
(async () => {
 const db = await connect();
 try {
  await db.query("BEGIN; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='20s'");
  const readMigration = name => fs.readFileSync('scripts/database/v1/'+name,'utf8').replace(/^--[^\n]*\n/gm,'').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
  const migrations = process.argv.includes('--followup-only') ? ['260_dashboard_workboard_waiting.sql'] : ['259_dashboard_completion.sql','260_dashboard_workboard_waiting.sql'];
  const sql = migrations.map(readMigration).join('\n');
  await db.query(sql);
  const checks = (await db.query(`SELECT
   NOT has_function_privilege('anon','public.admin_dashboard_business_analysis(date,date)','EXECUTE') anon_blocked,
   NOT has_table_privilege('authenticated','public.admin_dashboard_work_event','INSERT') journal_write_blocked,
   (SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_dashboard_work_event'::regclass) rls,
   (SELECT count(*)=4 FROM pg_trigger WHERE tgname='dashboard_work_transition') triggers`)).rows[0];
  assert(Object.values(checks).every(Boolean));
  // No historical source statuses, prices, payments or assignments are changed.
  const actor = (await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1")).rows[0];
  assert(actor,'Admin identity required for RPC verification');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor.auth_user_id]);
  const result=(await db.query("SELECT public.admin_dashboard_business_analysis((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-29,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) analysis, public.admin_dashboard_work_history((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) history")).rows[0];
  assert.equal(typeof result.analysis.cash.current.net,'number');
  assert.equal(result.analysis.customers.first_observed+result.analysis.customers.returned_from_before,result.analysis.customers.eligible);
  const independent=(await db.query(`SELECT count(*)::int count,coalesce((SELECT sum(d.quantity*d.unit_price-d.discount_amount) FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE o.order_status IN('completed','delivered') AND o.delivered_at>=$1 AND o.delivered_at<$2),0)::float8 value FROM public.sales_order WHERE order_status IN('completed','delivered') AND delivered_at>=$1 AND delivered_at<$2`,[result.analysis.from,result.analysis.to])).rows[0];
  const orderSummary=result.analysis.transactions.find(row=>row.period==='current'&&row.kind==='order')||{count:0,value:0};
  assert.equal(orderSummary.count,independent.count);assert(Math.abs(orderSummary.value-independent.value)<0.01);
  const bounds=result.analysis;
  assert.equal(Date.parse(bounds.to)-Date.parse(bounds.from),Date.parse(bounds.previous_to)-Date.parse(bounds.previous_from));
  assert.equal(result.history.rows.length,4);
  result.history.rows.forEach(row=>assert.equal(row.opening+row.opened+row.reopened-row.closed-row.removed,row.closing));
  const openCounts=(await db.query(`SELECT 'appointment' kind,count(*)::int n FROM public.appointment WHERE lower(appointment_status) IN('pending','confirmed','checked_in','in_progress','processing','cho_xac_nhan','da_xac_nhan','dang_thuc_hien')
   UNION ALL SELECT 'order',count(*)::int FROM public.sales_order WHERE lower(order_status) IN('draft','pending','confirmed','packing','shipped','shipping','cho_xac_nhan','da_xac_nhan','dang_dong_goi','dang_giao_hang','dang_giao')
   UNION ALL SELECT 'ticket',count(*)::int FROM public.support_ticket WHERE lower(status) NOT IN('closed','resolved','completed','rejected','da_dong','da_giai_quyet','tu_choi')
   UNION ALL SELECT 'return',count(*)::int FROM public.return_request WHERE lower(request_status) IN('pending','approved','da_duyet')`)).rows;
  for(const row of openCounts)assert.equal(result.history.rows.find(item=>item.kind===row.kind).closing,row.n,'Work history matches independently counted source records: '+row.kind);
  // Pure timestamp cases exercise SQL without inserting or changing any source appointments.
  const now=new Date('2026-11-21T10:00:00+07:00');
  const ageCases=[
   {appointment_status:'in_progress',scheduled_start_at:'2026-11-01T08:00:00+07:00',scheduled_end_at:'2026-11-21T09:30:00+07:00'},
   {appointment_status:'processing',scheduled_start_at:'2026-11-21T08:00:00+07:00',scheduled_end_at:'2026-11-21T11:00:00+07:00'},
   {appointment_status:'pending',scheduled_start_at:'2026-11-22T08:00:00+07:00'},
   {appointment_status:'pending',scheduled_start_at:'2026-11-21T08:00:00+07:00'},
   {appointment_status:'confirmed',scheduled_start_at:'2026-11-21T11:00:00+07:00'},
   {appointment_status:'checked_in',scheduled_start_at:'2026-11-21T09:00:00+07:00'}
  ];
  for(const source of ageCases){
   const row={id:'age-case',created_at:'2026-11-21T06:00:00+07:00',...source};
   const tasks=metrics.taskBoard(metrics.buildAlerts({pendingAppointments:[row],now}),{appointments:[row]});
   const actual=(await db.query('SELECT pawpal_private.dashboard_appointment_waiting($1,$2,$3,$4,$5)::float8 hours',[row.appointment_status,row.created_at,row.scheduled_start_at,row.scheduled_end_at||null,now])).rows[0].hours;
   assert.equal(actual,tasks[0]?.waitingHours??null,'SQL waiting age agrees with the alert reason: '+row.appointment_status);
  }
  const page=(await db.query("SELECT public.admin_dashboard_transaction_page((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-29,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'order',1,false) p")).rows[0].p;
  assert(page.rows.length<=10);assert(page.rows.every(row=>!Object.hasOwn(row,'customer_id')));
  // Reapplying must not add a second baseline or reset the observation clock.
  const before=(await db.query('SELECT count(*) n FROM public.admin_dashboard_work_event')).rows[0].n;
  await db.query(sql);
  assert.equal((await db.query('SELECT count(*) n FROM public.admin_dashboard_work_event')).rows[0].n,before);
  await db.query('SAVEPOINT lifecycle_test');
  await db.query(`CREATE TEMP TABLE dashboard_event_fixture(id uuid DEFAULT gen_random_uuid(),status text,staff_id uuid,note text);
   CREATE TRIGGER dashboard_fixture AFTER INSERT OR UPDATE OR DELETE ON dashboard_event_fixture FOR EACH ROW EXECUTE FUNCTION pawpal_private.dashboard_capture_transition('ticket','status','staff_id');`);
  const fixture=(await db.query("INSERT INTO dashboard_event_fixture(status) VALUES('pending') RETURNING id")).rows[0];
  await db.query(`UPDATE dashboard_event_fixture SET note='irrelevant edit';
   UPDATE dashboard_event_fixture SET staff_id=gen_random_uuid();
   UPDATE dashboard_event_fixture SET status='closed';
   UPDATE dashboard_event_fixture SET status='pending';
   DELETE FROM dashboard_event_fixture;`);
  const events=(await db.query("SELECT event_type,old_open,new_open,old_staff_id,new_staff_id FROM public.admin_dashboard_work_event WHERE record_id=$1 AND kind='ticket' ORDER BY id",[fixture.id])).rows;
  assert.equal(events.length,5); assert.equal(events.reduce((sum,e)=>sum+Number(e.new_open)-Number(e.old_open),0),0);
  assert.deepEqual(events.map(e=>e.event_type),['created','changed','changed','changed','deleted']);
  assert.equal(events[1].old_staff_id,null);assert(events[1].new_staff_id);assert(events[1].old_open&&events[1].new_open);
  await db.query('ROLLBACK TO SAVEPOINT lifecycle_test');
  const logistics=(await db.query('SELECT public.admin_dashboard_logistics_page(1) p')).rows[0].p;
  assert(logistics.rows.length<=10); assert(logistics.total>=logistics.rows.length);
  const work=(await db.query("SELECT public.admin_dashboard_work_page('all','all',1) p")).rows[0].p;
  assert(work.rows.length<=10);assert.equal(work.missing_sources.length,0);assert(work.total>=work.rows.length);
  const assigned=(await db.query("SELECT public.admin_dashboard_work_page('unassigned','all',1) p")).rows[0].p;
  assert(assigned.rows.every(row=>row.unassigned));
  const cashPage=(await db.query("SELECT public.admin_dashboard_cash_page((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-29,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'receipt',1) p")).rows[0].p;
  assert(cashPage.rows.length<=10);assert(cashPage.total>=cashPage.rows.length);
  const cashCount=(await db.query("SELECT count(*)::int n FROM public.payment WHERE transaction_status='succeeded' AND succeeded_at>=$1 AND succeeded_at<$2",[cashPage.from,cashPage.to])).rows[0].n;
  assert.equal(cashPage.total,cashCount);
  // Verify the public contract as actual API roles, including direct RPC access.
  async function rejected(sql,code) {
   await db.query('SAVEPOINT invalid_dashboard_call');let caught;
   try {await db.query(sql);} catch(error) {caught=error;}
   await db.query('ROLLBACK TO SAVEPOINT invalid_dashboard_call');
   await db.query('RELEASE SAVEPOINT invalid_dashboard_call');
   assert.equal(caught?.code,code);
  }
  await db.query('SET LOCAL ROLE authenticated');
  const api=(await db.query("SELECT public.admin_dashboard_business_analysis(current_date,current_date) p")).rows[0].p;
  assert.equal(typeof api.cash.current.net,'number');
  await rejected("SELECT public.admin_dashboard_transaction_page(current_date,current_date,NULL)",'22023');
  await rejected("SELECT public.admin_dashboard_business_analysis(current_date,current_date+100)",'22023');
  await db.query("SELECT set_config('request.jwt.claim.sub','',true)");
  await rejected("SELECT public.admin_dashboard_work_page()",'42501');
  await db.query('SET LOCAL ROLE anon');
  await rejected("SELECT public.admin_dashboard_business_analysis(current_date,current_date)",'42501');
  await db.query('RESET ROLE');
  const tracked=(await db.query('SELECT started_at FROM public.admin_dashboard_history_start')).rows[0].started_at;
  await db.query(process.argv.includes('--apply-cloud')?'COMMIT':'ROLLBACK');
  console.log((process.argv.includes('--apply-cloud')?'APPLIED':'PASS rollback validation')+': Dashboard analysis, transaction pages, prospective workflow journal, permissions, equations and idempotency. No source business records changed. Tracking starts: '+tracked.toISOString());
 } catch(e) {await db.query('ROLLBACK').catch(()=>{});throw e;} finally {await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
