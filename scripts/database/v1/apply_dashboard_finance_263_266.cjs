// Finance migration and rollback-only business verification. Credentials are never printed.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
const migrations=['263_dashboard_finance_register.sql','264_dashboard_finance_costs.sql','265_dashboard_finance_report.sql','266_dashboard_finance_pages.sql'];
function migrationSql(file,sourceTriggers=true){
 let sql=fs.readFileSync('scripts/database/v1/'+file,'utf8').replace(/\r\n/g,'\n').replace(/^--[^\n]*\n/gm,'').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
 if(!sourceTriggers&&file==='264_dashboard_finance_costs.sql'){
  sql=sql.replace(/^CREATE TRIGGER finance_capture_stock AFTER INSERT ON public\.inventory_transaction[^\n]*\n/m,'');
  const begin=sql.indexOf("DO $$ DECLARE t text;BEGIN\n FOREACH t IN ARRAY ARRAY['sales_order','appointment'");
  assert(begin>=0,'Reviewed source trigger block must be present');const end=sql.indexOf('END $$;',begin)+7;sql=sql.slice(0,begin)+sql.slice(end);
 }
 return sql;
}
(async()=>{
 const db=await connect();
 try{
  await db.query("BEGIN; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='25s'");
  const installed=(await db.query("SELECT to_regclass('public.finance_account') IS NOT NULL installed")).rows[0].installed;
  if(!installed)for(const file of migrations){const sql=migrationSql(file,false);try{await db.query(sql);}catch(error){const index=Number(error.position||error.internalPosition||1)-1;console.error(file+' near line '+sql.slice(0,index).split('\n').length);throw error;}}
  const actor=(await db.query("SELECT s.id,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1")).rows[0];assert(actor);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor.auth_user_id]);
  const report=(await db.query("SELECT public.admin_finance_report((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-29,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) p")).rows[0].p;
  assert(report.missing);assert.equal(typeof report.result_ready,'boolean');assert(Array.isArray(report.forecast.rows));
  for(const section of ['accounts','expenses','receivables','payables','obligations','source_documents','movements','unallocated_payments','unallocated_refunds','opening_coverage','refunds','refund_entries','services','service_entries','stock_costs','sale_costs','revenues','returns','credit_entries','purchases','customers','suppliers','audit']){
   const page=(await db.query("SELECT public.admin_finance_page($1,current_date-29,current_date,1,'') p",[section])).rows[0].p;
   assert(Array.isArray(page.rows)&&page.rows.length<=10);assert(page.total>=page.rows.length);
  }
  // All test facts and workspace signals roll back before any schema commit.
  await db.query('SAVEPOINT finance_facts');
  const post=async(action,data,version=null,id=crypto.randomUUID())=>(await db.query('SELECT public.admin_finance_post($1,$2,$3,$4) id',[id,action,data,version])).rows[0].id;
  const before=new Date(Date.now()-3*86400000).toISOString(),at=new Date(Date.now()-2*86400000).toISOString();
  const suffix=crypto.randomUUID();
  const accountData={name:'Rollback verification '+suffix,account_type:'cash',opening_balance:1000,opening_at:before,reference:'Rollback-only '+suffix};
  const requestId=crypto.randomUUID(),account=await post('account',accountData,null,requestId);
  assert.equal(await post('account',accountData,null,requestId),account,'Identical request cannot create a second account');
  const expense=await post('expense',{description:'Rollback-only expense',counterparty:suffix,category:'Validation',amount:100,recognized_on:'1970-01-01',due_on:'1970-01-02',reference:suffix});
  const expenseRow=(await db.query('SELECT updated_at::text updated_at FROM public.finance_entry WHERE id=$1',[expense])).rows[0];
  await post('settle',{source_id:expense,account_id:account,amount:40,occurred_at:at,description:'Rollback-only partial payment',reference:'PAY-'+suffix},expenseRow.updated_at);
  const settled=(await db.query('SELECT updated_at::text updated_at FROM public.finance_entry WHERE id=$1',[expense])).rows[0];
  const debt=(await db.query("SELECT public.admin_finance_page('obligations',current_date,current_date,1,$1) p",[suffix])).rows[0].p;
  assert.equal(debt.rows.find(row=>row.id===expense).remaining,60);
  const accountPage=(await db.query("SELECT public.admin_finance_page('accounts',current_date,current_date,1,$1) p",[suffix])).rows[0].p;
  assert.equal(accountPage.rows.find(row=>row.id===account).balance,960,'Cash payment and expense recognition are separate');
  const oldPeriod=(await db.query("SELECT public.admin_finance_report('1970-01-01','1970-01-01') p")).rows[0].p;
  assert.equal(oldPeriod.expense,100);assert.equal(oldPeriod.result,null,'Unreviewed period cannot publish a result');
  await post('period_review',{from:'1970-01-01',to:'1970-01-01',fingerprint:oldPeriod.fingerprint,expenses_complete:true,reference:'Reviewed rollback-only '+suffix});
  const reviewed=(await db.query("SELECT public.admin_finance_report('1970-01-01','1970-01-01') p")).rows[0].p;
  assert.equal(reviewed.result,-100,'Negative results are preserved after full source review');
  await post('expense',{description:'Additional rollback expense',counterparty:suffix,category:'Validation',amount:1,recognized_on:'1970-01-01',reference:'LATE-'+suffix});
  const changed=(await db.query("SELECT public.admin_finance_report('1970-01-01','1970-01-01') p")).rows[0].p;
  assert.equal(changed.result,null,'New facts invalidate a previous review');assert.equal(changed.review_current,false);
  const other=await post('account',{name:'Second rollback '+suffix,account_type:'bank',opening_balance:200,opening_at:before,reference:suffix});
  await post('transfer',{account_id:account,other_account_id:other,amount:50,occurred_at:at,description:'Rollback-only transfer',reference:'TRANSFER-'+suffix});
  const transfer=(await db.query('SELECT sum(amount)::float8 value,count(*)::int n FROM public.finance_cash_movement WHERE transfer_id IS NOT NULL AND account_id IN($1,$2)',[account,other])).rows[0];
  assert.equal(transfer.value,0);assert.equal(transfer.n,2);
  const leg=(await db.query('SELECT id,updated_at::text stamp FROM public.finance_cash_movement WHERE transfer_id IS NOT NULL AND account_id=$1',[account])).rows[0];
  await post('void_movement',{id:leg.id,description:'Rollback-only paired cancellation',reference:crypto.randomUUID()},leg.stamp);
  assert.equal((await db.query("SELECT count(*)::int n FROM public.finance_cash_movement WHERE transfer_id IS NOT NULL AND account_id IN($1,$2) AND status='posted'",[account,other])).rows[0].n,0,'Both transfer legs are voided atomically');
  await post('transfer',{account_id:account,other_account_id:other,amount:50,occurred_at:at,description:'Rollback-only replacement transfer',reference:'TRANSFER2-'+suffix});
  async function rejected(action,data,version,code){await db.query('SAVEPOINT invalid_finance');let error;try{await post(action,data,version);}catch(caught){error=caught;}await db.query('ROLLBACK TO SAVEPOINT invalid_finance');await db.query('RELEASE SAVEPOINT invalid_finance');assert.equal(error?.code,code);}
  await rejected('settle',{source_id:expense,account_id:account,amount:61,occurred_at:at,description:'Overpayment rejected',reference:'OVER-'+suffix},settled.updated_at,'PT409');
  await rejected('movement',{account_id:account,amount:1,occurred_at:at,description:'Direction required',reference:'BAD-'+suffix},null,'22023');
  await rejected('account',{...accountData,name:'NaN rollback '+suffix,opening_balance:'NaN'},null,'22023');
  const matchedAt=new Date(Date.now()-86400000).toISOString();
  await post('reconcile',{account_id:account,as_of:matchedAt,balance:910,reference:'MATCH-'+suffix});
  await rejected('movement',{account_id:account,direction:'out',amount:1,occurred_at:at,description:'Closed cash period',reference:'CLOSED-'+suffix},null,'22023');
  const customer=(await db.query('SELECT id FROM public.customer LIMIT 1')).rows[0],supplier=(await db.query('SELECT id FROM public.supplier LIMIT 1')).rows[0];
  if(customer){const id=await post('receivable',{customer_id:customer.id,description:'Rollback-only customer debt',amount:1,recognized_on:'1970-01-01',reference:'CUSTOMER-'+suffix});assert.equal((await db.query('SELECT customer_id FROM public.finance_entry WHERE id=$1',[id])).rows[0].customer_id,customer.id);}
  if(supplier){const id=await post('payable',{supplier_id:supplier.id,description:'Rollback-only supplier debt',amount:1,recognized_on:'1970-01-01',reference:'SUPPLIER-'+suffix});assert.equal((await db.query('SELECT supplier_id FROM public.finance_entry WHERE id=$1',[id])).rows[0].supplier_id,supplier.id);}
  const oldPayment=(await db.query("SELECT id FROM public.payment WHERE transaction_status='succeeded' AND succeeded_at<now()-interval '1 day' AND NOT EXISTS(SELECT 1 FROM public.finance_cash_movement m WHERE m.payment_id=payment.id AND m.status='posted') AND NOT EXISTS(SELECT 1 FROM public.finance_opening_coverage c WHERE c.payment_id=payment.id AND c.status='posted') LIMIT 1")).rows[0];
  if(oldPayment){
   const opening=await post('account',{name:'Covered rollback '+suffix,account_type:'bank',opening_balance:123,opening_at:matchedAt,reference:'OPENING-'+suffix});
   await post('payment_covered',{source_id:oldPayment.id,account_id:opening,reference:'COVERED-'+suffix});
   assert.equal((await db.query("SELECT public.admin_finance_page('accounts',current_date,current_date,1,$1) p",['Covered rollback '+suffix])).rows[0].p.rows[0].balance,123,'Opening coverage never posts cash twice');
   await rejected('payment',{source_id:oldPayment.id,account_id:opening,reference:'DUPLICATE-'+suffix},null,'PT409');
  }
  await db.query('ROLLBACK TO SAVEPOINT finance_facts');
  await db.query('SAVEPOINT finance_document_facts');
  // Existing source records are read-only anchors; only rollback financial facts are created.
  const refundedOrder=(await db.query(`SELECT o.id,t.total_amount::float8 total,
   coalesce((SELECT sum(amount) FROM public.payment WHERE order_id=o.id AND transaction_status='succeeded'),0)::float8 paid
   FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id
   WHERE o.delivered_at IS NOT NULL AND lower(o.order_status) IN('completed','delivered','returned','da_giao','da_giao_hang','da_tra_hang')
    AND EXISTS(SELECT 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id AND r.refund_status='succeeded' AND r.refunded_amount>0)
    AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.order_id=o.id OR f.refund_id IN(SELECT r.id FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id)) LIMIT 1`)).rows[0];
  if(refundedOrder){
   const refunds=(await db.query("SELECT r.id,r.refunded_amount::float8 amount FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=$1 AND r.refund_status='succeeded'",[refundedOrder.id])).rows;
   const returns=(await db.query("SELECT id FROM public.return_request WHERE sales_order_id=$1 AND request_status IN('approved','da_duyet','received','completed')",[refundedOrder.id])).rows;
   for(const rr of returns)await post('revenue_credit',{source_id:rr.id,amount:0,recognized_on:'1970-01-01',description:'Rollback-only zero additional reduction',reference:crypto.randomUUID()});
   for(const refund of refunds)refund.entry=await post('refund_allocation',{source_id:refund.id,amount:refund.amount,revenue_part:0,advance_part:0,expense_part:refund.amount,document_part:0,recognized_on:'1970-01-01',description:'Rollback-only compensation classification',reference:crypto.randomUUID()});
   const sourceBalance=async()=>{const row=(await db.query('SELECT balance::float8 balance,known FROM pawpal_private.finance_document_balances() WHERE kind=\'order\' AND record_id=$1',[refundedOrder.id])).rows[0];return row||{balance:0,known:true};};
   let calculated=await sourceBalance();assert.equal(calculated.known,true);assert.equal(calculated.balance,refundedOrder.total-refundedOrder.paid,'Compensation does not reopen an invoice');
   const refund=refunds[0],stamp=(await db.query('SELECT updated_at::text stamp FROM public.finance_entry WHERE id=$1',[refund.entry])).rows[0].stamp;
   await post('void_entry',{id:refund.entry,description:'Rollback-only correction',reference:crypto.randomUUID()},stamp);
   await rejected('refund_allocation',{source_id:refund.id,amount:refund.amount,revenue_part:0,advance_part:0,expense_part:0,document_part:0,recognized_on:'1970-01-01',description:'Invalid split rejected',reference:crypto.randomUUID()},null,'22023');
   await post('refund_allocation',{source_id:refund.id,amount:refund.amount,revenue_part:0,advance_part:refund.amount,expense_part:0,document_part:0,recognized_on:'1970-01-01',description:'Rollback-only advance refund',reference:crypto.randomUUID()});
   calculated=await sourceBalance();assert.equal(calculated.balance,refundedOrder.total-refundedOrder.paid+refund.amount,'Advance refunds change signed document balances exactly once');
   if(calculated.balance!==0){
    const due={source_id:refundedOrder.id,source_kind:'order',direction:calculated.balance>0?'receivable':'payable',due_on:'1970-01-02',reference:crypto.randomUUID()};
    await post('document_due',due);
    const saved=(await db.query("SELECT due_on::text due_day,updated_at::text stamp FROM public.finance_document_due WHERE kind='order' AND record_id=$1",[refundedOrder.id])).rows[0];assert.equal(saved.due_day,'1970-01-02');
    await rejected('document_due',{...due,due_on:'1970-01-03'},null,'PT409');
    await post('document_due',{...due,due_on:'1970-01-03'},saved.stamp);
   }
   console.log('PASS rollback source evidence: refund classification, signed invoice balances, explicit return acknowledgement and optimistic due dates.');
  }
  await db.query('ROLLBACK TO SAVEPOINT finance_document_facts');
  await db.query('SAVEPOINT finance_source_hooks');
  // Exercise the real trigger functions through temporary source tables; public source rows stay unchanged.
  const stockSource=(await db.query(`SELECT i.id transaction_id,i.product_variant_id,i.sales_order_detail_id FROM public.inventory_transaction i WHERE i.quantity<0 AND i.sales_order_detail_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_stock_cost_event c WHERE c.inventory_transaction_id=i.id) LIMIT 1`)).rows[0];
  if(stockSource){
   await db.query('ALTER TABLE public.finance_stock_cost_event ALTER CONSTRAINT finance_stock_cost_event_inventory_transaction_id_fkey DEFERRABLE INITIALLY DEFERRED');
   await db.query('INSERT INTO public.finance_stock_cost(product_variant_id,quantity,total_cost) VALUES($1,10,1000) ON CONFLICT(product_variant_id) DO UPDATE SET quantity=10,total_cost=1000',[stockSource.product_variant_id]);
   await db.query(`CREATE TEMP TABLE finance_inventory_fixture(id uuid,product_variant_id uuid,purchase_order_detail_id uuid,sales_order_detail_id uuid,return_request_detail_id uuid,quantity integer);
    CREATE TRIGGER fixture_cost AFTER INSERT ON finance_inventory_fixture FOR EACH ROW EXECUTE FUNCTION pawpal_private.finance_capture_stock();`);
   await db.query('INSERT INTO finance_inventory_fixture(id,product_variant_id,sales_order_detail_id,quantity) VALUES($1,$2,$3,-3)',[stockSource.transaction_id,stockSource.product_variant_id,stockSource.sales_order_detail_id]);
   await db.query('INSERT INTO finance_inventory_fixture(id,product_variant_id,sales_order_detail_id,quantity) VALUES($1,$2,$3,1)',[crypto.randomUUID(),stockSource.product_variant_id,stockSource.sales_order_detail_id]);
   const state=(await db.query('SELECT quantity,total_cost::float8 cost FROM public.finance_stock_cost WHERE product_variant_id=$1',[stockSource.product_variant_id])).rows[0];
   assert.equal(state.quantity,8);assert.equal(state.cost,800,'Sale and restoration use the captured original unit cost');
   const line=(await db.query('SELECT d.quantity FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE d.id=$1 AND o.delivered_at IS NOT NULL',[stockSource.sales_order_detail_id])).rows[0];
   if(line){
    const correction={source_id:stockSource.sales_order_detail_id,expected_quantity:line.quantity,correcting:true,amount:200,description:'Rollback-only original cost correction',reference:crypto.randomUUID()};
    await post('sale_cost',correction);
    assert.equal((await db.query('SELECT total_cost FROM public.finance_stock_cost WHERE product_variant_id=$1',[stockSource.product_variant_id])).rows[0].total_cost,null,'Corrected original cost requires remaining stock re-verification');
    await rejected('sale_cost',{...correction,amount:201},null,'PT409');
   }
  }
  const revenueSource=(await db.query("SELECT id,delivered_at FROM public.sales_order WHERE delivered_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.finance_revenue_source f WHERE f.kind='order' AND f.record_id=sales_order.id) LIMIT 1")).rows[0];
  if(revenueSource){
   await db.query(`CREATE TEMP TABLE sales_order(id uuid,delivered_at timestamptz);CREATE TRIGGER fixture_revenue AFTER INSERT ON sales_order FOR EACH ROW EXECUTE FUNCTION pawpal_private.finance_revenue_trigger();`);
   await db.query('INSERT INTO pg_temp.sales_order VALUES($1,$2)',[revenueSource.id,revenueSource.delivered_at]);
   const initial=(await db.query("SELECT total::float8 total FROM public.finance_revenue_source WHERE kind='order' AND record_id=$1",[revenueSource.id])).rows[0];assert(initial);
   await db.query('INSERT INTO pg_temp.sales_order VALUES($1,$2)',[revenueSource.id,revenueSource.delivered_at]);
   assert.equal((await db.query("SELECT count(*)::int n FROM public.finance_revenue_event WHERE kind='order' AND record_id=$1",[revenueSource.id])).rows[0].n,1,'Repeated completion does not duplicate recognition');
   if(initial.total>=1){await db.query("UPDATE public.finance_revenue_source SET total=total-1 WHERE kind='order' AND record_id=$1",[revenueSource.id]);await db.query('INSERT INTO pg_temp.sales_order VALUES($1,$2)',[revenueSource.id,revenueSource.delivered_at]);const delta=(await db.query("SELECT amount_delta::float8 delta FROM public.finance_revenue_event WHERE kind='order' AND record_id=$1 ORDER BY id DESC LIMIT 1",[revenueSource.id])).rows[0].delta;assert.equal(delta,1,'Later value changes append an adjustment');}
  }
  await db.query('ROLLBACK TO SAVEPOINT finance_source_hooks');
  const steps=(await db.query(`SELECT pawpal_private.finance_cost_step(10,1000,10,2000) receipt,pawpal_private.finance_cost_step(20,3000,-5) sale,pawpal_private.finance_cost_step(10,NULL,5,1000) unknown,pawpal_private.finance_cost_step(5,750,-5) depletion`)).rows[0];
  assert.equal(steps.receipt.total_cost,3000);assert.equal(steps.sale.cost_delta,-750);assert.equal(steps.unknown.total_cost,null);assert.equal(steps.depletion.total_cost,0);
  await db.query('SET LOCAL ROLE authenticated');
  assert.equal(typeof(await db.query("SELECT public.admin_finance_report(current_date,current_date) p")).rows[0].p.result_ready,'boolean');
  await db.query("SELECT set_config('request.jwt.claim.sub','',true)");
  await db.query('SAVEPOINT forbidden');let forbidden;try{await db.query('SELECT public.admin_finance_report(current_date,current_date)');}catch(error){forbidden=error;}await db.query('ROLLBACK TO SAVEPOINT forbidden');assert.equal(forbidden?.code,'42501');
  await db.query('RESET ROLE');
  const grants=(await db.query("SELECT NOT has_function_privilege('anon','public.admin_finance_post(uuid,text,jsonb,timestamptz)','EXECUTE') blocked,NOT has_table_privilege('authenticated','public.finance_cash_movement','INSERT') direct_write_blocked")).rows[0];assert(grants.blocked&&grants.direct_write_blocked);
  if(process.argv.includes('--apply-cloud')&&!installed){
   // Install source-table triggers only in a short, final deployment transaction.
   await db.query('ROLLBACK');await db.query("BEGIN; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='25s'");
   for(const file of migrations)await db.query(migrationSql(file));
   await db.query('COMMIT');
  }else await db.query(process.argv.includes('--apply-cloud')?'COMMIT':'ROLLBACK');
  console.log((process.argv.includes('--apply-cloud')?'APPLIED':'PASS rollback validation')+': finance register/report/pages, partial settlement, idempotency, paired transfers, reconciliation lock, permission boundaries and weighted-cost arithmetic. All test facts rolled back; no source business records changed.');
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}finally{await db.end();}
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
