// Two actual checkout writers, existing catalog read only, all business writes rollback.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for bounded stock serialization checks.');process.exit(0);}
(async()=>{
 const clients=[],checks=[];let pending;const pass=name=>checks.push({name,status:'PASS'});
 try{
  clients.push(await connect());clients.push(await connect());const [a,b]=clients;
  for(const db of clients)await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='5s';SET LOCAL ROLE service_role");
  const catalog=(await a.query(`SELECT v.id,
   coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-
   coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0) available
   FROM public.product_variant v JOIN public.product p ON p.id=v.product_id
   WHERE lower(v.status)='active' AND lower(p.status)='active' AND v.sale_price=round(v.sale_price)
   AND coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-
   coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0) BETWEEN 2 AND 1000000
   ORDER BY v.id LIMIT 1`)).rows[0];assert.ok(catalog,'No eligible public catalog variant');
  const method=(await a.query("SELECT id FROM public.payment_method_config WHERE available AND fee=0 AND lower(short_name) IN('cod','cash','bank transfer','vietqr') ORDER BY id LIMIT 1")).rows[0];assert.ok(method);
  const details={delivery:false,discount_mode:'none'},lines=[{variant_id:catalog.id,quantity:1}],tokens=[crypto.randomBytes(32).toString('hex'),crypto.randomBytes(32).toString('hex')],ids=Array.from({length:4},()=>crypto.randomUUID());
  const quote=async(db,token,items)=>(await db.query('SELECT public.guest_sales_quote($1,$2,$3) value',[token,JSON.stringify(details),JSON.stringify(items)])).rows[0].value;
  const qa=await quote(a,tokens[0],lines),qb=await quote(b,tokens[1],lines);
  assert.equal(qa.version,qb.version);
  const expires=(await a.query("SELECT now()+interval '1 day' expires")).rows[0].expires;
  const create=(db,token,id,version,items)=>db.query('SELECT public.guest_sales_create($1,$2,$3,$4,$5,$6,$7,$8) value',
   [token,expires,id,version,JSON.stringify({name:'Guest stock rollback probe',phone:'0950000001'}),JSON.stringify(details),JSON.stringify(items),method.id]);
  const pidA=(await a.query('SELECT pg_backend_pid() pid')).rows[0].pid,pidB=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  await create(a,tokens[0],ids[0],qa.version,lines);
  pending=create(b,tokens[1],ids[1],qb.version,lines).then(value=>({value}),error=>({error}));
  let blockers=[];
  for(let i=0;i<10;i++){
   blockers=(await a.query('SELECT pg_blocking_pids($1) blockers',[pidB])).rows[0].blockers;
   if(blockers.map(Number).includes(Number(pidA)))break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(blockers.map(Number).includes(Number(pidA)),'Checkout B must wait on checkout A');
  const waiting=(await a.query('SELECT locktype FROM pg_locks WHERE pid=$1 AND NOT granted',[pidB])).rows;
  assert.ok(waiting.some(row=>['transactionid','tuple'].includes(row.locktype)),'Expected catalog row contention, not a shared session token');
  pass('Different sessions checking out the same real variant serialize on a database row lock');
  await a.query('ROLLBACK');const result=await pending;pending=null;if(result.error)throw result.error;assert.equal(result.value.rows[0].value,ids[1]);
  pass('Waiting checkout completes after the first writer rolls back');
  // Exhaust only this transaction's view of stock; no committed public hold is visible.
  const remaining=(await b.query(`SELECT coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=$1),0)-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=$1 AND status='active' AND expires_at>now()),0) n`,[catalog.id])).rows[0].n;
  assert.ok(Number(remaining)>=1&&Number(remaining)<=1000000);
  const lastLines=[{variant_id:catalog.id,quantity:Number(remaining)}],lastQuote=await quote(b,tokens[1],lastLines);
  await create(b,tokens[1],ids[2],lastQuote.version,lastLines);
  await b.query('SAVEPOINT exhausted');let rejected;
  try{await create(b,tokens[1],ids[3],qb.version,lines);}catch(error){rejected=error;}
  await b.query('ROLLBACK TO SAVEPOINT exhausted');assert.equal(rejected?.code,'23514');assert.equal(rejected?.message,'sales_available_stock_insufficient');
  assert.equal((await b.query('SELECT count(*)::int n FROM public.sales_order WHERE id=$1',[ids[3]])).rows[0].n,0);
  assert.equal((await b.query('SELECT count(*)::int n FROM public.stock_reservation WHERE order_id=$1',[ids[3]])).rows[0].n,0);
  pass('An old quote cannot create an order or hold once available stock is exhausted in the transaction');
  await create(b,tokens[1],ids[1],qb.version,lines);
  const parts=(await b.query(`SELECT (SELECT count(*)::int FROM public.sales_order_detail WHERE order_id=$1) lines,(SELECT count(*)::int FROM public.stock_reservation WHERE order_id=$1) holds,(SELECT count(*)::int FROM public.payment WHERE order_id=$1) payments`,[ids[1]])).rows[0];
  assert.equal(parts.lines,1);assert.equal(parts.holds,1);assert.ok(parts.payments<=1);
  await b.query('SET CONSTRAINTS ALL IMMEDIATE');
  pass('Exact retry still returns its original order after stock exhaustion, with no duplicate line/hold/payment');
  const owners=(await b.query('SELECT customer_id FROM public.guest_session WHERE token_hash=ANY($1::text[])',[tokens])).rows.map(row=>row.customer_id);
  await b.query('ROLLBACK');
  assert.equal((await a.query('SELECT count(*)::int n FROM public.sales_order WHERE id=ANY($1::uuid[])',[ids])).rows[0].n,0);
  assert.equal((await a.query('SELECT count(*)::int n FROM public.guest_session WHERE token_hash=ANY($1::text[])',[tokens])).rows[0].n,0);
  assert.equal((await a.query('SELECT count(*)::int n FROM public.customer WHERE id=ANY($1::uuid[])',[owners])).rows[0].n,0);
  pass('All test orders, holds, payments and guest profiles rolled back; catalog/stock ledger were never edited');
  fs.writeFileSync('docs/verification/sync/guest-stock-serialization-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks,scope:'Installed Cloud SQL checkout RPCs and two independent service_role connections; existing public variant price/ledger unchanged. Bounded row-lock contention followed by rollback, transaction-local exhaustion and exact retry. No commit, after-commit overselling, HTTP/UI, gateway, stress testing or Supabase Logs acceptance.'},null,2)+'\n');
  console.log('PASS',checks.length,'stock serialization checks; no committed fixtures.');
 }finally{
  if(clients[0])await clients[0].query('ROLLBACK').catch(()=>{});
  if(pending)await pending;
  for(const db of clients){await db.query('ROLLBACK').catch(()=>{});await db.end();}
 }
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
