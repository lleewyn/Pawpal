// Actual Admin login + PostgREST schema/read checks. No business writes or fixtures.
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
if(!process.argv.includes('--cloud')){console.log('Use --cloud for actual Admin Auth and bounded read-only PostgREST checks.');process.exit(0);}
(async()=>{
 const env=require('dotenv').parse(fs.readFileSync('.env'));
 assert.equal(env.PAWPAL_ADMIN_SUPABASE_URL,'https://cpzuvaplseielhgcnqrn.supabase.co');
 process.env.PAWPAL_ADMIN_SUPABASE_URL=env.PAWPAL_ADMIN_SUPABASE_URL;
 process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY=env.PAWPAL_ADMIN_SUPABASE_ANON_KEY;
 const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
 const email=credentials.match(/^Email: (.+)$/m)?.[1].trim(),password=credentials.match(/^Password: (.+)$/m)?.[1].trim();assert.ok(email&&password);
 const config=require('../../api/admin-config.js'),files=new Set(['/pages/admin/login/login.js','/pages/admin/login/login.css','/pages/admin/admin.css','/scripts/vendor/supabase.js','/scripts/api/supabase-client.js']);
 let browser;const errors=[],blockedWrites=[],requests=[];
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/api/admin-config')return config(req,res);
  if(pathname==='/admin'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<!doctype html><html><body><p>Admin read-only verification</p><script>window.__PAWPAL_SUPABASE_CONFIG__={required:true}</script><script src="/scripts/vendor/supabase.js"></script><script src="/api/admin-config"></script><script src="/scripts/api/supabase-client.js"></script></body></html>');}
  const file=pathname==='/admin/login'?'pages/admin/login/login.html':files.has(pathname)?pathname.slice(1):null;
  if(!file){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript'});res.end(fs.readFileSync(file));
 });
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===base)return route.continue();
   if(url.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')return route.abort();
   if(url.pathname.startsWith('/rest/v1/')){
    const readRpc=['get_staff_login_context','get_admin_sales_cashier'].some(name=>url.pathname==='/rest/v1/rpc/'+name);
    if(!['GET','HEAD'].includes(request.method())&&!readRpc){blockedWrites.push(url.pathname);return route.abort();}
   }else if(!url.pathname.startsWith('/auth/v1/'))return route.abort();
   return route.continue();
  });
  page.on('response',response=>{const url=new URL(response.url());if(url.hostname==='cpzuvaplseielhgcnqrn.supabase.co'){requests.push({path:url.pathname,method:response.request().method(),status:response.status()});if(response.status()>=400)errors.push(url.pathname+':'+response.status());}});
  await page.goto(base+'/admin/login',{waitUntil:'domcontentloaded'});await page.locator('#inputAdminEmail').fill(email);await page.locator('#inputAdminPassword').fill(password);await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
  await page.waitForFunction(()=>!!window.getSupabaseClient?.());
  const summary=await page.evaluate(async()=>{
   const db=getSupabaseClient(),session=await db.auth.getSession();
   if(!session.data.session)throw new Error('No actual Auth session');
   const original=await db.from('sales_order').select('id').order('id').limit(1);if(original.error)throw new Error('sales_order_read:'+original.error.code);
   const returns=await db.from('return_request').select('id,replacement:sales_replacement(order_id,kind,order:order_id(id,order_status,tracking_code))').order('id').limit(1);
   if(returns.error)throw new Error('replacement_embedding:'+returns.error.code);
   const links=await db.from('sales_replacement').select('order_id,return_request_id,kind').limit(1);if(links.error)throw new Error('replacement_rls_read:'+links.error.code);
   let cashier=false;
   if(original.data.length){const result=await db.rpc('get_admin_sales_cashier',{p_order_id:original.data[0].id});if(result.error)throw new Error('cashier_read:'+result.error.code);cashier=!!result.data.version&&Array.isArray(result.data.payments);}
   return {actualAuth:true,featureEnabled:window.PAWPAL_SALES_REPLACEMENTS_ENABLED===true,postgrestEmbedding:true,mappingRead:true,boundedOrderRows:original.data.length,boundedReturnRows:returns.data.length,boundedMappingRows:links.data.length,cashierRead:cashier};
  });
  assert.equal(summary.actualAuth,true);assert.equal(summary.featureEnabled,true);assert.equal(summary.postgrestEmbedding,true);assert.equal(summary.mappingRead,true);assert.deepEqual(errors,[]);assert.deepEqual(blockedWrites,[]);assert.ok(requests.length<=10,'Bounded Auth/REST calls');
  const report={timestamp:new Date().toISOString(),environment:'Local actual Admin login + Supabase Cloud cpzuvaplseielhgcnqrn Auth/PostgREST',status:'PASS',scope:'Existing private Admin test account; actual login UI/Auth and deployed read RPC/schema only, max one row per GET; no business mutations or fixtures; not customer Auth, full Admin portal, COMMIT/Realtime or concurrent writers',summary,requests,businessWrites:0};
  fs.writeFileSync('docs/verification/sync/sales-replacements-auth-readonly.txt',JSON.stringify(report,null,2)+'\n');console.log('PASS actual Admin Auth, feature flag, PostgREST replacement embedding/RLS and bounded cashier read;',requests.length,'Auth/REST calls; zero business writes.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error('Read-only Auth verification failed:',error.message);process.exitCode=1;});
