const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {service,admin,ok,env,token}=require('./customer_completion_helpers.cjs');
const {createClient}=require('@supabase/supabase-js');
const uuid=()=>crypto.randomUUID();
(async()=>{
 await ok(admin.auth.signInWithPassword((()=>{const s=require('fs').readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');return {email:s.match(/^Email: (.+)$/m)[1],password:s.match(/^Password: (.+)$/m)[1]};})()));
 const category=(await ok(service.from('product_category').select('id').limit(1).single())).id,pid=uuid(),vid=uuid();
 await ok(service.from('product').insert({id:pid,category_id:category,product_name:'Stock verification '+pid,slug:'test-'+pid,unit:'unit',status:'active'}));
 await ok(service.from('product_variant').insert({id:vid,product_id:pid,sku_variant:'TEST-'+vid,cost_price:10,sale_price:20}));
 const details=async(quantity,operation='ADD')=>{
  const p=await ok(service.from('product').select('updated_at').eq('id',pid).single()),v=await ok(service.from('product_variant').select('updated_at').eq('id',vid).single()),inv=await ok(service.from('inventory').select('quantity_in_stock').eq('product_variant_id',vid).maybeSingle());
  return {quantity,operation,reason:'Stock verification',expected_stock:inv?.quantity_in_stock||0,expected_updated_at:p.updated_at,expected_variant_updated_at:v.updated_at,status:'active',price:null};
 };
 const request={p_request_id:uuid(),p_variant_id:vid,p_details:await details(10)};
 await Promise.all([ok(admin.rpc('adjust_admin_sales_stock',request)),ok(admin.rpc('adjust_admin_sales_stock',request))]);
 assert.equal((await ok(service.from('inventory').select('quantity_in_stock').eq('product_variant_id',vid).single())).quantity_in_stock,10);
 assert.equal((await ok(service.from('inventory_transaction').select('id').eq('product_variant_id',vid))).length,1);
 assert.equal((await admin.rpc('adjust_admin_sales_stock',{...request,p_details:{...request.p_details,quantity:11}})).error.code,'PT409');
 assert.equal((await admin.rpc('adjust_admin_sales_stock',{...request,p_request_id:uuid()})).error.code,'PT409');
 for(const quantity of [-1,0,1.5])assert.equal((await admin.rpc('adjust_admin_sales_stock',{p_request_id:uuid(),p_variant_id:vid,p_details:await details(quantity)})).error.code,'22023');
 const orderId=uuid(),customerId=(await ok(service.from('customer').select('id').limit(1).single())).id;
 await ok(service.from('sales_order').insert({id:orderId,order_code:'TEST-'+orderId,customer_id:customerId}));
 await ok(service.from('stock_reservation').insert({product_variant_id:vid,cart_id:null,order_id:orderId,quantity:8,expires_at:new Date(Date.now()+3600000).toISOString(),status:'active'}));
 const failed={p_request_id:uuid(),p_variant_id:vid,p_details:{...await details(3,'SUB'),price:99}};
 assert.equal((await admin.rpc('adjust_admin_sales_stock',failed)).error.code,'23514');
 assert.equal((await ok(service.from('product_variant').select('sale_price').eq('id',vid).single())).sale_price,20);
 assert.equal((await ok(service.from('audit_log').select('id').eq('entity_id',failed.p_request_id))).length,0);
 const race=await details(1);
 const results=await Promise.all([admin.rpc('adjust_admin_sales_stock',{p_request_id:uuid(),p_variant_id:vid,p_details:race}),admin.rpc('adjust_admin_sales_stock',{p_request_id:uuid(),p_variant_id:vid,p_details:race})]);
 assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error).error.code,'PT409');
 const anonymous=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,{auth:{persistSession:false},global:{fetch:(url,init)=>fetch(String(url).replace('http://localhost:8000/rest/v1','http://localhost:8011'),init)}});
 assert.ok((await anonymous.rpc('adjust_admin_sales_stock',{...request,p_request_id:uuid()})).error);
 console.log('PASS stock ledger/idempotency/conflict/reservations/atomic rollback/concurrency/anonymous denial on restored database');
})().catch(e=>{console.error(e.message);process.exitCode=1;});

