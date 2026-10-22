const fs=require('node:fs'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
const env=require('dotenv').parse(fs.readFileSync(infra+'/.env'));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only customer verification');
const state=JSON.parse(fs.readFileSync(infra+'/customer-completion.private.txt','utf8'));
if(!/^pawpal_customers_[a-f0-9]{12}$/.test(state.stage))throw Error('Invalid restored database');
const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
const account={email:credentials.match(/^Email: (.+)$/m)[1],password:credentials.match(/^Password: (.+)$/m)[1]};
const rewrite=url=>'http://localhost:8011'+new URL(url).pathname.replace(/^\/rest\/v1/,'')+new URL(url).search;
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(String(url).includes('/rest/v1/')?rewrite(String(url)):url,init)}};
const service=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,options),admin=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,options);
async function ok(r){const v=await r;if(v.error)throw Error(v.error.message);return v.data;}
async function browserPage({restored=true,authRestored=false}={}){
 await ok(admin.auth.signInWithPassword(account));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});
 if(authRestored){if(state.authPort!==8021)throw Error('Isolated Auth is required');await page.route('**/auth/v1/**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:'http://localhost:8021'+u.pathname.slice(8)+u.search});await route.fulfill({response});});}
 if(restored)await page.route('**/rest/v1/**',async route=>{try{const response=await route.fetch({url:rewrite(route.request().url())});await route.fulfill({response});}catch{if(!page.isClosed())await route.abort().catch(()=>{});}});
 await page.goto('http://localhost:3001/admin/login');await page.locator('#inputAdminEmail').fill(account.email);await page.locator('#inputAdminPassword').fill(account.password);await page.locator('#btnSubmitAdminLogin').click();
 await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded');
 return {browser,page};
}
async function customer(name='Customer verification'){
 const phone='09'+String(crypto.randomInt(0,100000000)).padStart(8,'0');
 const id=await ok(admin.rpc('create_customer_quick',{p_full_name:name,p_phone:phone}));return {id,phone,name};
}
async function refresh(page){await page.evaluate(()=>window.PawpalCustomers.loadCustomersModuleData({force:true}));}
async function showProfile(page,id){await refresh(page);await page.evaluate(id=>{const mod=window.PawpalCustomers,c=Object.values(mod.state.customerDatabase).find(c=>c.dbId===id);sessionStorage.setItem('pawpal_admin_customer_id',c.id);mod.subtabs.profile.renderDrawerCustomerProfile(c.id);mod.switchSubtab('tab-profile');},id);}
function token(uid){const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const raw=b({alg:'HS256',typ:'JWT'})+'.'+b({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+600});return raw+'.'+crypto.createHmac('sha256',env.JWT_SECRET).update(raw).digest('base64url');}
module.exports={infra,state,env,service,admin,ok,browserPage,customer,refresh,showProfile,token};
