// Browser -> installed checkout SQL with transaction-only catalog/stock/voucher fixtures.
require('dotenv').config();
const express=require('express'),fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
const {createGuestCommerce,cookieConfiguration}=require('../api/guest_commerce');
if(!process.argv.includes('--bridge')){console.log('Use --bridge for a temporary localhost:4003 rollback bridge.');process.exit(0);}
(async()=>{
 const db=await connect(),app=express(),orders=new Set(),hashes=new Set(),calls={};let queue=Promise.resolve(),server,closing=false,queries=0;
 const q=(sql,args)=>{queries++;return db.query(sql,args);};
 await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s';SET LOCAL idle_in_transaction_session_timeout='5min'");
 const products=[crypto.randomUUID(),crypto.randomUUID()],variants=[crypto.randomUUID(),crypto.randomUUID()],voucher=crypto.randomUUID(),voucherCode='UI-'+voucher;
 const category=(await q('SELECT id FROM public.product_category ORDER BY id LIMIT 1')).rows[0]?.id;assert.ok(category);
 for(let i=0;i<2;i++){
  await q("INSERT INTO public.product(id,category_id,product_name,unit,slug) VALUES($1,$2,$3,'Cái',$4)",[products[i],category,'Guest SQL browser fixture '+(i+1),'guest-ui-'+products[i]]);
  await q('INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price) VALUES($1,$2,$3,10000,$4)',[variants[i],products[i],'UI-'+variants[i],i===0?50000:30000]);
  await q("INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,idempotency_key) VALUES($1,'opening',10,'Browser rollback fixture',$2)",[variants[i],'guest-ui-opening:'+variants[i]]);
 }
 await q("INSERT INTO public.voucher(id,voucher_code,voucher_name,discount_value,minimum_order_amount,required_points,start_date,end_date,is_active,type,applicable_for,max_usage) VALUES($1,$2,'Browser SQL rollback voucher',10000,1,0,current_date-1,current_date+1,true,'fixed','shop',10)",[voucher,voucherCode]);
 const clock=Number((await q('SELECT extract(epoch FROM now())::float8 seconds')).rows[0].seconds)*1000;
 await q('SET LOCAL ROLE anon');
 const catalog=(await q("SELECT coalesce(jsonb_agg(item),'[]'::jsonb) value FROM jsonb_array_elements(public.customer_shop_catalog()) item WHERE item->>'id'=ANY($1::text[])",[products])).rows[0].value;assert.equal(catalog.length,2);
 await q('SET LOCAL ROLE service_role');
 const mapping={guest_commerce_context:['p_hash','p_page'],guest_commerce_end:['p_hash'],guest_sales_quote:['p_hash','p_details','p_lines'],guest_sales_create:['p_hash','p_expires','p_request','p_expected_quote','p_contact','p_details','p_lines','p_payment'],guest_sales_receipt:['p_hash','p_request']};
 const admin={rpc(name,args){const operation=queue.then(async()=>{
  assert.ok(mapping[name]);calls[name]=(calls[name]||0)+1;hashes.add(args.p_hash);await q('SAVEPOINT browser_call');
  try{const keys=mapping[name];const data=(await q(`SELECT public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) value`,keys.map(k=>['p_details','p_lines','p_contact'].includes(k)?JSON.stringify(args[k]):args[k]))).rows[0].value;
   await q('RELEASE SAVEPOINT browser_call');if(name==='guest_sales_create')orders.add(args.p_request);return {data};
  }catch(error){await q('ROLLBACK TO SAVEPOINT browser_call');await q('RELEASE SAVEPOINT browser_call');console.log('Probe RPC rejected:',name,error.code,error.message);return {error:{code:error.code,message:error.message}};}
 });queue=operation.catch(()=>{});return operation;}};
 const handler=createGuestCommerce({admin,...cookieConfiguration({...process.env,PORT:'4001'}),now:()=>clock,limit:async()=>{}});
 app.use(express.json({limit:'20kb'}));app.all('/api/customer/guest/:action',(req,res)=>handler(req,res,req.params.action));
 app.get('/__catalog',(_req,res)=>res.json(catalog));app.get('/__fixture',(_req,res)=>res.json({products,variants,voucherCode}));
 async function finish(status){
  if(closing)return;closing=true;await queue;
  const ids=[...orders],owners=(await q('SELECT DISTINCT customer_id FROM public.sales_order WHERE id=ANY($1::uuid[])',[ids])).rows.map(row=>row.customer_id);
  const parts=(await q(`SELECT (SELECT count(*)::int FROM public.sales_order WHERE id=ANY($1::uuid[])) orders,(SELECT count(*)::int FROM public.sales_order_detail WHERE order_id=ANY($1::uuid[])) lines,(SELECT count(*)::int FROM public.stock_reservation WHERE order_id=ANY($1::uuid[])) holds,(SELECT count(*)::int FROM public.payment WHERE order_id=ANY($1::uuid[])) payments,(SELECT count(*)::int FROM public.payment WHERE order_id=ANY($1::uuid[]) AND transaction_status='succeeded') collected,(SELECT count(*)::int FROM public.voucher_redemption WHERE order_id=ANY($1::uuid[])) redemptions`,[ids])).rows[0];
  assert.equal(parts.orders,orders.size);assert.equal(parts.lines,orders.size);assert.equal(parts.holds,orders.size);assert.equal(parts.payments,orders.size);assert.equal(parts.collected,0);
  await q('SET CONSTRAINTS ALL IMMEDIATE');await q('ROLLBACK');
  for(const [table,column,values]of [['sales_order','id',ids],['stock_reservation','order_id',ids],['payment','order_id',ids],['customer','id',owners],['product','id',products],['product_variant','id',variants],['inventory_transaction','product_variant_id',variants],['voucher','id',[voucher]]])assert.equal((await q(`SELECT count(*)::int n FROM public.${table} WHERE ${column}=ANY($1::uuid[])`,[values])).rows[0].n,0);
  assert.equal((await q('SELECT count(*)::int n FROM public.guest_session WHERE token_hash=ANY($1::text[])',[[...hashes]])).rows[0].n,0);
  const report=process.argv.includes('--recovery-run')?'guest-sales-recovery-rollback.txt':'guest-sales-browser-rollback.txt';
  fs.writeFileSync('docs/verification/sync/'+report,JSON.stringify({timestamp:new Date().toISOString(),status,queries,rpcCalls:calls,parts,fixtureProducts:products.length,remainingFixtureRows:0,scope:'Playwright -> loopback HTTP -> installed Cloud service_role checkout RPCs in rollback. Catalog read from actual customer_shop_catalog under anon inside the same transaction, filtered to two synthetic products and forwarded to browser. Synthetic inventory/voucher never committed, no real catalog/stock edits or locks on public sellable product rows. Rate limiter bypassed; not commit/Realtime/Admin/gateway/SMS acceptance.'},null,2)+'\n');
  await db.end();server?.close();console.log('Checkout rollback complete; no fixture rows retained.');
 }
 app.post('/__finish',async(_req,res)=>{try{await finish('PASS');res.json({success:true});}catch(error){await db.query('ROLLBACK').catch(()=>{});res.status(500).json({success:false});console.error(error.code||error.name,error.message);await db.end().catch(()=>{});server?.close();}});
 server=app.listen(4003,'127.0.0.1',()=>console.log('Sales rollback bridge ready on 4003.'));
 server.on('error',async()=>{await db.query('ROLLBACK').catch(()=>{});await db.end();process.exitCode=1;});
 setTimeout(()=>finish('TIMEOUT').catch(async()=>{await db.query('ROLLBACK').catch(()=>{});await db.end().catch(()=>{});server.close();}),240000).unref();
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
