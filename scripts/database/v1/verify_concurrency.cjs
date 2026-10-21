const {spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
function session(db,statement){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['exec','-i','supabase-db','psql','-X','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});
 let error='';child.stderr.on('data',b=>error+=b);child.stdout.resume();child.on('error',reject);
 child.on('close',code=>resolve({code,error}));child.stdin.end(statement);
});}
async function verifyConcurrency(db,sql){
 if(!/^pawpal_v1check_[a-f0-9]{16}$/.test(db))throw Error('Concurrency fixtures require disposable V1 database');
 const [c,cat,product,variant,order,method]=Array.from({length:6},()=>randomUUID());
 sql(db,`BEGIN;
 INSERT INTO public.customer(id,customer_code) VALUES('${c}','CONCURRENCY');
 INSERT INTO public.paw_point_transaction(customer_id,points,idempotency_key,sequence_no) VALUES('${c}',10,'CONCURRENCY-SEED',1);
 INSERT INTO public.product_category(id,category_name) VALUES('${cat}','Concurrency verification');
 INSERT INTO public.product(id,category_id,product_name,unit,slug) VALUES('${product}','${cat}','Concurrency verification','item','concurrency-verification');
 INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price) VALUES('${variant}','${product}','CONCURRENCY-SKU',1,100);
 INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,idempotency_key) VALUES('${variant}','adjustment',5,'CONCURRENCY-STOCK');
 INSERT INTO public.sales_order(id,customer_id,order_code,order_status) VALUES('${order}','${c}','CONCURRENCY-O','completed');
 INSERT INTO public.sales_order_detail(order_id,product_variant_id,quantity,unit_price,product_name_snapshot,sku_snapshot) VALUES('${order}','${variant}',1,100,'Snapshot','CONCURRENCY-SKU');
 INSERT INTO public.payment_method_config(id,name,fee,available,requires_info) VALUES('${method}','Concurrency verification',0,true,false);
 COMMIT;`);
 const attempts=[
  ['points',i=>`INSERT INTO public.paw_point_transaction(customer_id,points,idempotency_key,sequence_no) VALUES('${c}',-7,'CONCURRENT-P${i}',2)`],
  ['payments',i=>`INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,idempotency_key,order_id) VALUES('CONCURRENT-PAY${i}','${c}','${method}','partial',60,'succeeded',now(),'CONCURRENT-PAY${i}','${order}')`],
  ['reservations',i=>`INSERT INTO public.stock_reservation(product_variant_id,order_id,quantity,expires_at,status) VALUES('${variant}','${order}',4,now()+interval '1 hour','active')`]
 ];
 for(const[name,statement]of attempts){
  const a=session(db,'BEGIN;'+statement(1)+'; SELECT pg_sleep(1); COMMIT;');
  await new Promise(r=>setTimeout(r,150));
  const b=session(db,'BEGIN;'+statement(2)+'; COMMIT;');
  const results=await Promise.all([a,b]);
  if(results.filter(r=>r.code===0).length!==1)throw Error('Concurrent '+name+' must allow exactly one transaction: '+results.map(r=>r.error).join(' '));
  console.log('PASS concurrent '+name+': exactly one winner, no overspend/overcharge/oversell');
 }
 if(sql(db,`SELECT sum(points) FROM public.paw_point_transaction WHERE customer_id='${c}'`)!=='3')throw Error('Concurrent point balance incorrect');
}
module.exports={verifyConcurrency};
