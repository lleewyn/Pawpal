// One synthetic order/SKU, transaction-only fixtures. No actual money or delivery.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud')){console.log('Use --cloud for two-browser HTTP/Cloud-SQL rollback integration. No real Auth or committed fixtures.');process.exit(0);}
const http=require('node:http'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const db=await connect();let queries=0,server,browser,queue=Promise.resolve(),stopping=false;
 const stop=async()=>{stopping=true;if(browser){await browser.close();browser=null;}if(server){await new Promise(r=>server.close(r));server=null;}await queue.catch(()=>{});};
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
  const line=(await q('SELECT id FROM public.sales_order_detail WHERE order_id=$1',[id])).rows[0].id;row=await order(id);
  await actor(a);await q('SELECT public.request_own_sales_return($1,$2,$3,$4::jsonb)',[rid,id,row.updated_at,JSON.stringify({type:'exchange',reason:'E2E browser exchange',lines:[{line_id:line,quantity:2}]})]);
  await actor(sa);const revision=(await q('SELECT updated_at::text revision FROM public.return_request WHERE id=$1',[rid])).rows[0].revision;
  await q("SELECT public.save_admin_sales_return($1,$2,$3,$4,'receive',$5::jsonb)",[randomUUID(),rid,id,revision,JSON.stringify({reason:'E2E inspected',received:true,inspected:true,saleable:true})]);
  const tokens={admin:randomUUID(),owner:randomUUID(),other:randomUUID()},identities=new Map([[tokens.admin,sa],[tokens.owner,a],[tokens.other,b]]),network=[];
  const readReturn=async()=>{
   const result=await q(`SELECT to_jsonb(r)||jsonb_build_object(
    'updated_at',r.updated_at::text,
    'replacement',(SELECT to_jsonb(s)||jsonb_build_object('order',to_jsonb(o)) FROM public.sales_replacement s JOIN public.sales_order o ON o.id=s.order_id WHERE s.return_request_id=r.id),
    'return_request_detail',(SELECT coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('sales_order_detail',to_jsonb(l)) ORDER BY d.id),'[]') FROM public.return_request_detail d JOIN public.sales_order_detail l ON l.id=d.sales_order_detail_id WHERE d.return_request_id=r.id)) value
    FROM public.return_request r WHERE r.id=$1`,[rid]);return result.rows[0]?.value||null;
  };
  const readModel=async()=>{
   const current=(await q('SELECT * FROM public.sales_order WHERE id=$1',[id])).rows[0];if(!current)return null;
   const request=await readReturn();return {id:current.order_code,rawId:current.id,address:[current.street_address_snapshot,current.province_snapshot].filter(Boolean).join(', '),returnRequests:request?[{...request,lines:request.return_request_detail.map(d=>({...d,line:d.sales_order_detail}))}]:[]};
  };
  const serial=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
  // Fixed loopback-only test transport. One PG transaction serializes role + query.
  // Tokens below identify synthetic actors, NOT Supabase Auth sessions or JWTs.
  const assets=new Set(['/pages/admin/admin.css','/pages/admin/modules/orders/orders.css','/pages/admin/modules/orders/subtabs/tab-sales-replacements.js','/pages/user/modules/orders/return-detail.js','/scripts/shared/customer-realtime.mjs','/pages/user/modules/orders/order-detail.css','/pages/user/modules/orders/return-detail.css']);
  server=http.createServer(async(req,res)=>{
   const url=new URL(req.url,'http://127.0.0.1');
   const send=(status,body)=>{const text=JSON.stringify(body);network.push({path:url.pathname,status,bytes:Buffer.byteLength(text)});res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(text);};
   try{
    if(stopping)return send(503,{error:{message:'stopping'}});
    if(req.method==='GET'){
     let file;if(url.pathname==='/admin')file='pages/admin/modules/orders/orders.html';else if(url.pathname==='/customer')file='pages/user/modules/orders/return-detail.html';else if(assets.has(url.pathname))file=url.pathname.slice(1);
     if(url.pathname==='/scripts/api/api.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('export const API={initData:async()=>{}};');}
     if(!file){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript'});return res.end(fs.readFileSync(file));
    }
    const token=req.headers['x-test-session'];if(!identities.has(token))return send(401,{error:{message:'test_session_required'}});
    if(req.method!=='POST'||!['/__test/read','/__test/rpc','/__test/advance'].includes(url.pathname))return send(404,{});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000){res.writeHead(413);return res.end();}}const body=JSON.parse(raw||'{}');
    const result=await serial(async()=>{
     await actor(identities.get(token));await q('SAVEPOINT http_request');
     try{
      let data;
      if(url.pathname==='/__test/read')data=body.view==='model'?await readModel():await readReturn();
      else if(url.pathname==='/__test/rpc'){
       assert.equal(body.name,'create_admin_sales_replacement');assert.equal(body.args.p_return_id,rid);
       data=(await q('SELECT public.create_admin_sales_replacement($1,$2,$3,$4::jsonb) value',[body.args.p_request_id,rid,body.args.p_expected_updated_at,JSON.stringify(body.args.p_details)])).rows[0].value;
      }else{
       // Harness invokes the existing fulfillment RPC, not the production shipping UI.
       assert.equal(token,tokens.admin);assert.ok(['confirm','ship','complete'].includes(body.action));
       const linked=(await q('SELECT order_id FROM public.sales_replacement WHERE return_request_id=$1',[rid])).rows[0].order_id;
       const state=await order(linked),details=body.action==='ship'?{provider_id:provider,tracking_code:'E2E-HTTP-TRACK'}:{};
       await q('SELECT public.update_admin_sales_order($1,$2,$3,$4,$5::jsonb)',[randomUUID(),linked,state.updated_at,body.action,JSON.stringify(details)]);data=await readReturn();
      }
      await q('RELEASE SAVEPOINT http_request');return {data};
     }catch(error){await q('ROLLBACK TO SAVEPOINT http_request');await q('RELEASE SAVEPOINT http_request');return {error:{code:error.code||'test_error',message:error.message}};}
    });send(result.error?400:200,result);
   }catch{send(400,{error:{message:'invalid_test_request'}});}
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'chrome',headless:true});const admin=await browser.newPage({viewport:{width:1366,height:1000}}),customer=await browser.newPage({viewport:{width:1200,height:1000}}),other=await browser.newPage();const errors=[];
  for(const page of [admin,customer,other]){page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());}
  function bootstrap({token,customerId}){
   window.PAWPAL_SALES_REPLACEMENTS_ENABLED=true;localStorage.setItem('pawpal_current_user',JSON.stringify({id:customerId}));
   window.testRequest=async(path,body)=>{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','x-test-session':token},body:JSON.stringify(body)});return response.json();};
   window.getSupabaseClient=()=>({rpc:(name,args)=>testRequest('/__test/rpc',{name,args}),from(){return {select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},maybeSingle:()=>testRequest('/__test/read',{view:'return'})};}});
  }
  await admin.addInitScript(bootstrap,{token:tokens.admin,customerId:staff});await customer.addInitScript(bootstrap,{token:tokens.owner,customerId:ca});await other.addInitScript(bootstrap,{token:tokens.other,customerId:cb});
  await Promise.all([admin.goto(base+'/admin',{waitUntil:'domcontentloaded'}),customer.goto(base+'/customer?orderId='+id,{waitUntil:'domcontentloaded'}),other.goto(base+'/customer?orderId='+id,{waitUntil:'domcontentloaded'})]);
  const loadCustomer=page=>page.evaluate(async()=>{window.module=await import('/pages/user/modules/orders/return-detail.js');await window.module.init();});
  await loadCustomer(customer);assert.match(await customer.locator('#rma-status-badge').textContent(),/Đã nhận/);pass('Customer module reads inspected return through HTTP and Cloud RLS');
  await loadCustomer(other);assert.match(await other.locator('.return-detail-module-container').textContent(),/Không tìm thấy/);pass('Other customer sees empty owner-scoped result over HTTP');
  for(const file of ['pages/admin/admin.css','pages/admin/modules/orders/orders.css'])await admin.addStyleTag({url:base+'/'+file});
  await admin.evaluate(async()=>{
   const {data}=await testRequest('/__test/read',{view:'model'});window.current=data;
   window.PawpalOrders={state:{orders:[data]},helpers:{showToast:()=>{}},ensureOrder:async()=>{const result=await testRequest('/__test/read',{view:'model'});window.current=result.data;return result.data;}};
  });
  const detailSource=fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-detail.js','utf8'),receiptAnchor=detailSource.indexOf(" const modal=document.createElement('div');modal.id='modalSalesReturnReceipt'");assert.ok(receiptAnchor>0);
  await admin.addScriptTag({content:detailSource.slice(detailSource.lastIndexOf('(function(){',receiptAnchor))});await admin.addScriptTag({url:base+'/pages/admin/modules/orders/subtabs/tab-sales-replacements.js'});
  await admin.evaluate(()=>PawpalOrders.openSalesReplacement(current,current.returnRequests[0]));await admin.locator('#salesReplacementReason').fill('Đổi hàng đã kiểm định qua kiểm thử HTTP');await admin.locator('#salesReplacementConfirmed').check();
  await admin.evaluate(()=>{const button=document.getElementById('btnSaveSalesReplacement');button.click();button.click();});await admin.waitForFunction(()=>!!window.current.returnRequests[0].replacement);
  assert.equal(network.filter(n=>n.path==='/__test/rpc').length,1);pass('Actual Admin modal sends one HTTP RPC and refreshes persisted-in-transaction linked order');
  await customer.reload({waitUntil:'domcontentloaded'});await loadCustomer(customer);assert.match(await customer.locator('#rma-timeline').textContent(),/Đơn đổi hàng/);assert.match(await customer.locator('#rma-timeline').textContent(),/Không thu thêm tiền/);
  const replacement=await customer.locator('#rma-timeline a').getAttribute('href');assert.match(replacement,/#order-detail\?id=/);pass('Customer reload reads replacement order from Cloud with no fabricated RPC response');
  const [ownRead,otherRead]=await Promise.all([customer.evaluate(()=>testRequest('/__test/read',{})),other.evaluate(()=>testRequest('/__test/read',{}))]);assert.ok(ownRead.data?.replacement);assert.equal(otherRead.data,null);pass('Simultaneous HTTP reads keep A/B identity isolated on serialized transaction transport');
  const failure=await other.evaluate(async rid=>testRequest('/__test/rpc',{name:'create_admin_sales_replacement',args:{p_request_id:crypto.randomUUID(),p_return_id:rid,p_expected_updated_at:new Date().toISOString(),p_details:{kind:'exchange',reason:'E2E unauthorized',confirmed:true,lines:[]}}}),rid);assert.equal(failure.error.code,'42501');pass('Other customer cannot invoke Admin replacement RPC via HTTP');
  for(const action of ['confirm','ship']){const result=await admin.evaluate(action=>testRequest('/__test/advance',{action}),action);assert.ok(!result.error,result.error?.message);}
  await customer.reload({waitUntil:'domcontentloaded'});await loadCustomer(customer);assert.match(await customer.locator('#rma-timeline').textContent(),/E2E-HTTP-TRACK/);assert.match(await customer.locator('#rma-timeline').textContent(),/Đang giao/);pass('Existing fulfillment RPC shipping is visible after customer reload with exact tracking');
  const result=await admin.evaluate(()=>testRequest('/__test/advance',{action:'complete'}));assert.ok(!result.error,result.error?.message);
  await customer.reload({waitUntil:'domcontentloaded'});await loadCustomer(customer);assert.equal(await customer.locator('#rma-status-badge').textContent(),'Hoàn tất');pass('Existing completion RPC updates customer RMA to completed over HTTP read');
  await admin.evaluate(async()=>{const model=await PawpalOrders.ensureOrder();PawpalOrders.renderSalesReturns(model);});assert.match(await admin.locator('#detailOrderRmaBannerContainer').textContent(),/Đã giao/);assert.match(await admin.locator('#detailOrderRmaBannerContainer').textContent(),/E2E-HTTP-TRACK/);pass('Actual Admin return renderer reads matching replacement completion/tracking');
  await customer.waitForFunction(()=>!document.querySelector('.return-detail-skeleton'));for(const file of ['order-detail.css','return-detail.css'])await customer.addStyleTag({content:fs.readFileSync('pages/user/modules/orders/'+file,'utf8').replace(/^@import[^;]+;/gm,'')});
  await customer.locator('#rma-timeline').screenshot({path:'docs/verification/sync/sales-replacement-http-customer.png'});assert.deepEqual(errors,[]);
  assert.ok(network.length<=20,'Bounded business HTTP requests');report.http={requests:network.length,responseBytes:network.reduce((n,r)=>n+r.bytes,0),trace:network};
  await stop();await q('RESET ROLE');const linked=(await q('SELECT order_id FROM public.sales_replacement WHERE return_request_id=$1',[rid])).rows[0].order_id;
  assert.equal(Number((await q("SELECT coalesce(sum(quantity),0) n FROM public.inventory_transaction WHERE product_variant_id=$1",[variant])).rows[0].n),1);pass('Replacement issued exactly two units after inspected stock return');
  await q('ROLLBACK');assert.equal((await q('SELECT EXISTS(SELECT 1 FROM public.sales_order WHERE id=ANY($1::uuid[])) OR EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($3::uuid[])) remains',[[id,linked],[ca,cb],[a,b,sa]])).rows[0].remains,false);pass('Rollback removed original and replacement orders plus all supporting fixtures');
  report.status='PASS';report.queries=queries;report.scope='Actual Admin replacement modal and customer return module -> loopback test HTTP bridge -> deployed Cloud RPC/RLS; one serialized PG transaction, always rollback. Bootstrap API stub and synthetic actor tokens; not Supabase Auth, PostgREST embedding, COMMIT, production shipping UI, Realtime or concurrent DB writers. No Logs/load tests or actual delivery/money.';
  fs.writeFileSync('docs/verification/sync/sales-replacements-http-rollback.txt',JSON.stringify(report,null,2)+'\n');console.log('PASS',report.checks.length,'HTTP/browser/SQL rollback checks;',queries,'SQL;',report.http.requests,'business HTTP requests. NOT committed Auth/Realtime E2E.');
 }catch(e){await stop().catch(()=>{});await db.query('ROLLBACK').catch(()=>{});console.error('HTTP replacement failed after',report.checks.length,'checks:',e.code||'',e.message);process.exitCode=1;}finally{await stop().catch(()=>{});await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
