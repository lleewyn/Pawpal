// Validate full KPI counts against independent source reads; roll back unless --apply-cloud.
const fs=require('node:fs'),assert=require('node:assert/strict');
const M=require('../../../pages/admin/modules/dashboard/subtabs/operations-metrics.js');
const {connect}=require('./service_import_connection.cjs');
(async()=>{
 const db=await connect();
 try {
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='20s'");
  const sql=fs.readFileSync('scripts/database/v1/262_dashboard_operation_totals.sql','utf8').replace(/^--[^\n]*\n/gm,'').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
  await db.query(sql);
  const actor=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1")).rows[0];assert(actor);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor.auth_user_id]);
  await db.query('SET LOCAL ROLE authenticated');
  const report=(await db.query("SELECT public.admin_dashboard_operation_totals((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-29,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) p")).rows[0].p;
  assert.equal(Object.keys(report.metrics).length,6);
  for(const metric of Object.values(report.metrics)){assert(metric.available);assert(Number.isSafeInteger(metric.value)&&metric.value>=0);}
  const todayGroups=(await db.query("SELECT appointment_status status,count(*)::int n FROM public.appointment WHERE scheduled_start_at>=$1 AND scheduled_start_at<$1::timestamptz+interval '1 day' GROUP BY appointment_status",[report.today])).rows;
  assert.equal(report.metrics.todayAppointments.value,todayGroups.filter(row=>M.isValidAppointment({appointment_status:row.status})).reduce((sum,row)=>sum+row.n,0));
  const orderGroups=(await db.query('SELECT order_status status,count(*)::int n FROM public.sales_order GROUP BY order_status')).rows;
  assert.equal(report.metrics.pendingOrders.value,orderGroups.filter(row=>['pending','processing'].includes(M.classifyOrder(row.status))).reduce((sum,row)=>sum+row.n,0));
  const supportGroups=(await db.query('SELECT status,count(*)::int n FROM public.support_ticket GROUP BY status')).rows;
  assert.equal(report.metrics.openTickets.value,supportGroups.filter(row=>M.isTicketOpen(row.status)).reduce((sum,row)=>sum+row.n,0));
  const pending=(await db.query(`SELECT count(*)::int pending FROM public.appointment WHERE lower(btrim(appointment_status)) IN('pending','cho_xac_nhan')`)).rows[0].pending;
  const unassigned=(await db.query(`SELECT count(*)::int n FROM (
   SELECT a.id FROM public.appointment a LEFT JOIN public.appointment_item i ON i.appointment_id=a.id AND i.staff_id IS NOT NULL AND lower(btrim(i.status)) NOT IN('cancelled','canceled','da_huy')
   WHERE lower(btrim(a.appointment_status)) IN('confirmed','da_xac_nhan','checked_in') AND a.staff_id IS NULL AND a.scheduled_start_at<=$1::timestamptz+interval '24 hours'
   GROUP BY a.id HAVING count(i.id)=0) x`,[report.as_of])).rows[0].n;
  assert.equal(report.metrics.pendingAppointments.value,pending+unassigned);
  const stock=(await db.query("SELECT public.admin_dashboard_work_page('all','stock',1) p")).rows[0].p;
  assert.equal(report.metrics.lowStock.value,stock.total,'Stock KPI matches the complete server work feed');
  const schedules=(await db.query(`SELECT sch.staff_id,sch.start_at,sch.end_at,sch.schedule_status,sch.availability_status,s.employment_status
   FROM public.staff_schedule sch JOIN public.staff s ON s.id=sch.staff_id
   WHERE sch.start_at<$1 AND sch.end_at>$2 OR sch.start_at<=$3 AND sch.end_at>$3`,[report.to,report.from,report.as_of])).rows;
  const valid=schedules.filter(row=>M.isActiveSchedule(row)&&M.isActiveStaff(row)&&Date.parse(row.end_at)>Date.parse(row.start_at));
  assert.equal(report.metrics.staffOnShift.value,new Set(valid.filter(row=>Date.parse(row.start_at)<Date.parse(report.to)&&Date.parse(row.end_at)>Date.parse(report.from)).map(row=>row.staff_id)).size);
  assert.equal(report.metrics.staffOnShift.on_shift_now,new Set(valid.filter(row=>Date.parse(row.start_at)<=Date.parse(report.as_of)&&Date.parse(row.end_at)>Date.parse(report.as_of)).map(row=>row.staff_id)).size);
  async function rejected(query,code){await db.query('SAVEPOINT invalid_totals');let caught;try{await db.query(query);}catch(error){caught=error;}await db.query('ROLLBACK TO SAVEPOINT invalid_totals');await db.query('RELEASE SAVEPOINT invalid_totals');assert.equal(caught?.code,code);}
  await rejected('SELECT public.admin_dashboard_operation_totals(current_date,current_date+100)','22023');
  await db.query("SELECT set_config('request.jwt.claim.sub','',true)");
  await rejected('SELECT public.admin_dashboard_operation_totals(current_date,current_date)','42501');
  await db.query('SET LOCAL ROLE anon');await rejected('SELECT public.admin_dashboard_operation_totals(current_date,current_date)','42501');
  await db.query('RESET ROLE');await db.query(sql);
  await db.query(process.argv.includes('--apply-cloud')?'COMMIT':'ROLLBACK');
  console.log((process.argv.includes('--apply-cloud')?'APPLIED':'PASS rollback validation')+': all six full KPI totals match independent sources; staff deduplication, bounded dates, API permissions and idempotency pass. No source business records changed.');
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}finally{await db.end();}
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
