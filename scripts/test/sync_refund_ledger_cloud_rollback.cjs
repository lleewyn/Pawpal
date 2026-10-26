// One synthetic order/SKU, transaction-only fixtures. No actual money or delivery.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud')){console.log('Use --cloud for bounded refund ledger boundary checks; otherwise no network.');process.exit(0);}
(async()=>{const db=await connect();let queries=0;
 const report={environment:'Supabase Cloud cpzuvaplseielhgcnqrn',timestamp:new Date().toISOString(),scope:'One synthetic COD order/SKU; RPC/RLS only; always ROLLBACK; no Logs',checks:[]};
 const q=async(sql,args)=>{queries++;return db.query(sql,args);};
 const actor=async(id,role='authenticated')=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);await q(role==='anon'?'SET LOCAL ROLE anon':'SET LOCAL ROLE authenticated');};
 const denied=async(fn,codes)=>{await q('SAVEPOINT expected_denial');let error;try{await fn();}catch(e){error=e;}await q('ROLLBACK TO SAVEPOINT expected_denial');await q('RELEASE SAVEPOINT expected_denial');assert.ok(error,'Expected denial');assert.ok(codes.includes(error.code),'Unexpected SQLSTATE '+error.code);};
 const pass=name=>report.checks.push({name,status:'PASS'});
 const order=async id=>(await q('SELECT id,customer_id,order_status,shipping_status,tracking_code,updated_at::text FROM public.sales_order WHERE id=$1',[id])).rows[0];
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  const a=randomUUID(),b=randomUUID(),sa=randomUUID(),staff=randomUUID(),ca=randomUUID(),cb=randomUUID(),product=randomUUID(),variant=randomUUID(),id=randomUUID(),method=randomUUID(),delivery=randomUUID(),provider=randomUUID();
  report.fixtureIds={customerA:ca,customerB:cb,product,variant,order:id};
  const category=(await q('SELECT id FROM public.product_category ORDER BY id LIMIT 1')).rows[0]?.id;assert.ok(category);
  await q('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,sa]);
  await q('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3),($4,$5,$6)',[ca,a,'E2E-ORD-A-'+ca,cb,b,'E2E-ORD-B-'+cb]);
  await q("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'E2E Order A'),($2,'E2E Order B') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[ca,cb]);
  await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'E2E Order Admin','QA','active',false)",[staff,sa]);
  await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  await q("INSERT INTO public.product(id,category_id,product_name,unit,slug) VALUES($1,$2,'E2E Order Product','Cai',$3)",[product,category,'e2e-order-'+product]);
  await q('INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price) VALUES($1,$2,$3,30000,50000)',[variant,product,'E2E-'+variant]);
  await q("INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,idempotency_key) VALUES($1,'opening',3,'E2E rollback only',$2)",[variant,'e2e-opening:'+variant]);
  await q("INSERT INTO public.payment_method_config(id,name,short_name,fee,available) VALUES($1,'E2E COD','cod',0,true)",[method]);
  await q("INSERT INTO public.delivery_option_config(id,name,fee,available) VALUES($1,'E2E Delivery',5000,true)",[delivery]);
  await q("INSERT INTO public.shipping_provider(id,provider_name,provider_code,status) VALUES($1,'E2E Provider',$2,'active')",[provider,'E2E-'+provider]);
  await q("UPDATE public.payment_method_config SET name='Tiền mặt' WHERE id=$1",[method]);
  const details={delivery:true,delivery_option_id:delivery,receiver_name:'E2E Receiver',receiver_phone:'0000000000',province:'E2E Province',street_address:'E2E Street',discount_mode:'none'};
  const lines=[{variant_id:variant,quantity:2}],rid=randomUUID(),collect=randomUUID(),refund=randomUUID();
  await actor(a);const quote=(await q('SELECT public.quote_own_sales_order($1::jsonb,$2::jsonb) value',[JSON.stringify(details),JSON.stringify(lines)])).rows[0].value;
  await q('SELECT public.create_own_sales_order($1,$2,$3::jsonb,$4::jsonb,$5)',[id,quote.version,JSON.stringify(details),JSON.stringify(lines),method]);
  await actor(sa);let row=await order(id);await q("SELECT public.update_admin_sales_order($1,$2,$3,'confirm','{}'::jsonb)",[randomUUID(),id,row.updated_at]);row=await order(id);
  await q("SELECT public.update_admin_sales_order($1,$2,$3,'ship',$4::jsonb)",[randomUUID(),id,row.updated_at,JSON.stringify({provider_id:provider,tracking_code:'E2E-RETURN'})]);row=await order(id);
  await q("SELECT public.update_admin_sales_order($1,$2,$3,'complete','{}'::jsonb)",[randomUUID(),id,row.updated_at]);
  const cashier=async()=>(await q('SELECT public.get_admin_sales_cashier($1) value',[id])).rows[0].value;
  let state=await cashier();const cash={method_id:method,amount:105000,reason:'E2E synthetic receipt',confirmed:true};
  for(let i=0;i<2;i++)await q("SELECT public.post_admin_sales_money($1,$2,$3,'collect',$4::jsonb)",[collect,id,state.version,JSON.stringify(cash)]);
  state=await cashier();assert.equal(Number(state.collected),105000);assert.equal(state.payments.filter(p=>p.id===collect).length,1);pass('Admin collection retry records one synthetic succeeded payment');
  const loyalty=async()=>(await q('SELECT public.own_loyalty_snapshot() value')).rows[0].value;
  const money={method_id:method,payment_id:collect,amount:50000,reason:'E2E ledger boundary',confirmed:true};
  await q('RESET ROLE');await q('UPDATE public.payment SET eligible_spend_amount=100000 WHERE id=$1',[collect]);
  await actor(a);let snapshot=await loyalty();assert.equal(Number(snapshot.eligible_spend),100000);assert.equal(Number(snapshot.points),0);pass('User reads eligible fixture payment without invented reward points');
  const guard=async()=>{
   await q('SAVEPOINT guard');let error;try{await q("SELECT public.post_admin_sales_money($1,$2,$3,'refund',$4::jsonb)",[refund,id,state.version,JSON.stringify(money)]);}catch(e){error=e;}
   await q('ROLLBACK TO SAVEPOINT guard');await q('RELEASE SAVEPOINT guard');assert.equal(error?.code,'22023');assert.match(error.message,/sales_refund_ledger_review_required/);
  };
  await actor(sa);state=await cashier();await guard();assert.equal(Number((await q('SELECT count(*) n FROM public.refund_transaction WHERE payment_id=$1',[collect])).rows[0].n),0);pass('Quick refund requires ledger review for eligible payment and leaves no partial refund');
  await q('SAVEPOINT reward_branch');await q('RESET ROLE');await q('UPDATE public.payment SET eligible_spend_amount=0 WHERE id=$1',[collect]);
  await q("INSERT INTO public.paw_point_transaction(customer_id,payment_id,points,idempotency_key,sequence_no,description) VALUES($1,$2,10,$3,1,'E2E reward fixture')",[ca,collect,'e2e-reward:'+collect]);
  await actor(sa);state=await cashier();await guard();await actor(a);snapshot=await loyalty();assert.equal(Number(snapshot.points),10);assert.equal(snapshot.history.length,1);pass('Reward ledger independently blocks quick refund; reward stays unchanged');
  await q('ROLLBACK TO SAVEPOINT reward_branch');await q('RELEASE SAVEPOINT reward_branch');await q('RESET ROLE');
  await q("INSERT INTO public.refund_transaction(id,refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,completed_at,eligible_refund_amount) VALUES($1,$2,$3,'partial',50000,50000,50000,'original','succeeded',now(),50000)",[refund,'E2E-'+refund,collect]);
  await actor(a);snapshot=await loyalty();assert.equal(Number(snapshot.eligible_spend),50000);assert.equal(Number(snapshot.points),0);pass('Snapshot subtracts succeeded eligible refund without generating points');
  await actor(b);snapshot=await loyalty();assert.equal(Number(snapshot.eligible_spend),0);assert.equal(Number(snapshot.points),0);pass('B does not inherit A eligible spending or refund');
  await q('RESET ROLE');await denied(()=>q("INSERT INTO public.refund_transaction(refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,completed_at,eligible_refund_amount) VALUES($1,$2,'partial',55000,55000,55000,'original','succeeded',now(),55000)",['E2E-OVER-'+refund,collect]),['23514']);pass('Integrity rejects cumulative eligible refunds above eligible spending');
  await q('ROLLBACK');
  const remains=(await q('SELECT EXISTS(SELECT 1 FROM public.sales_order WHERE id=$1) OR EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($3::uuid[])) OR EXISTS(SELECT 1 FROM public.refund_transaction WHERE id=$4) OR EXISTS(SELECT 1 FROM public.payment WHERE id=$5) OR EXISTS(SELECT 1 FROM public.product WHERE id=$6) OR EXISTS(SELECT 1 FROM public.payment_method_config WHERE id=$7) OR EXISTS(SELECT 1 FROM public.delivery_option_config WHERE id=$8) OR EXISTS(SELECT 1 FROM public.shipping_provider WHERE id=$9) OR EXISTS(SELECT 1 FROM public.staff WHERE id=$10) remains',[id,[ca,cb],[a,b,sa],refund,collect,product,method,delivery,provider,staff])).rows[0].remains;assert.equal(remains,false);pass('Rollback removes synthetic payment/refund/reward and supporting fixtures');
  report.status='PASS';report.queries=queries;report.scope='Refund ledger safety boundary and eligible-spend arithmetic only; synthetic rollback; no external money or Logs';
  fs.writeFileSync('docs/verification/sync/refund-ledger-cloud-rollback.txt',JSON.stringify(report,null,2)+'\n');console.log('PASS',report.checks.length,'refund ledger checks;',queries,'SQL statements; rollback verified. Not automatic reward reversal E2E.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Refund ledger check failed after',report.checks.length,'checks:',e.code||'',e.message);process.exitCode=1;}finally{await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
