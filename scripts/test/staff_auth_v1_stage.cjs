// Auth and public writes both target the restored DB, through ports 8021/8011.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');const {env,state,infra}=require('./customer_completion_helpers.cjs');
const {createStaffAuthHandlers}=require('../api/staff_auth.js');const uuid=()=>crypto.randomUUID();
const stageState=JSON.parse(fs.readFileSync(infra+'/customer-completion.private.txt','utf8'));assert.equal(stageState.stage,state.stage);assert.equal(stageState.authPort,8021);
const rewrite=async(url,init)=>{const u=new URL(url),auth=u.pathname.startsWith('/auth/v1/'),rest=u.pathname.startsWith('/rest/v1/');if(!auth&&!rest)throw Error('Unexpected request');return fetch('http://localhost:'+(auth?8021:8011)+u.pathname.slice(auth?8:8)+u.search,init);};
const config={url:env.SUPABASE_PUBLIC_URL,anonKey:env.ANON_KEY,serviceKey:env.SERVICE_ROLE_KEY,fetch:rewrite},options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:rewrite}};
const admin=createClient(config.url,config.anonKey,options),service=createClient(config.url,config.serviceKey,options),handlers=createStaffAuthHandlers(config);
const ok=async request=>{const result=await request;if(result.error)throw Error(result.error.message);return result.data;};
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
async function invoke(name,body,token,method='POST'){const res=response();await handlers[name]({method,headers:token?{authorization:'Bearer '+token}:{},body},res);return res;}
(async()=>{
 const file=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8'),account={email:file.match(/^Email: (.+)$/m)[1].trim(),password:file.match(/^Password: (.+)$/m)[1].trim()};
 const login=await ok(admin.auth.signInWithPassword(account)),token=login.session.access_token;
 const before=(await ok(service.auth.admin.listUsers({perPage:200}))).users.map(u=>({id:u.id,banned_until:u.banned_until}));
 assert.equal((await invoke('provisionAccount',{},null)).code,401);assert.equal((await invoke('provisionAccount',{},token,'GET')).code,405);
 const request={requestId:uuid(),staffId:uuid(),profile:{full_name:'Staff account verification',job_title:'Test employee',phone_number:null,email:null,address:null,dob:null,hire_date:null,specialization:null,employment_status:'active',service_locked:false,staff_level_id:null,reason:'Verification creation'},email:'staff-'+uuid()+'@pawpal.test',password:'Verify-'+uuid(),roles:[],permissions:['customer.read'],enableLogin:false};
 const created=await invoke('provisionAccount',request,token);assert.equal(created.code,200,JSON.stringify(created.body));assert.equal((await invoke('provisionAccount',request,token)).code,200);
 const person=await ok(service.from('staff').select('*').eq('id',request.staffId).single());assert.equal(person.must_change_password,true);
 const identity=(await ok(service.auth.admin.getUserById(person.auth_user_id))).user;assert.ok(Date.parse(identity.banned_until)>Date.now());
 assert.equal((await service.auth.signInWithPassword({email:request.email,password:request.password})).error?.message!==undefined,true);
 const duplicate={...request,requestId:uuid(),staffId:uuid(),email:account.email};assert.equal((await invoke('provisionAccount',duplicate,token)).code,409);await ok(admin.auth.signInWithPassword(account));
 const context=(await ok(admin.rpc('get_staff_login_context'))).staff;
 assert.equal((await admin.rpc('set_admin_staff_access',{p_request_id:uuid(),p_staff_id:context.id,p_expected_updated_at:(await ok(service.from('staff').select('updated_at').eq('id',context.id).single())).updated_at,p_roles:[],p_permissions:[],p_reason:'Verify last Admin guard'})).error.message,'staff_last_admin_required');
 const selfLock=await invoke('toggleAccountStatus',{requestId:uuid(),staffId:context.id,expectedUpdatedAt:(await ok(service.from('staff').select('updated_at').eq('id',context.id).single())).updated_at,action:'lock'},token);assert.equal(selfLock.code,400);
 const action=async(name,extra={})=>{const version=(await ok(service.from('staff').select('updated_at').eq('id',request.staffId).single())).updated_at;const body={requestId:uuid(),staffId:request.staffId,expectedUpdatedAt:version,...extra};const result=await invoke(name,body,token);assert.equal(result.code,200,JSON.stringify(result.body));return body;};
 await action('toggleAccountStatus',{action:'unlock'});
 const employee=createClient(config.url,config.anonKey,options),signed=await ok(employee.auth.signInWithPassword({email:request.email,password:request.password}));let employeeToken=signed.session.access_token;
 let own=await ok(employee.rpc('get_staff_login_context'));assert.equal(own.staff.must_change_password,true);assert.deepEqual(own.staff.permission_codes,[]);
 const changePassword=require('../api/staff-password-handler.cjs')(config),changed=response(),newPassword='Changed-'+uuid();await changePassword({headers:{authorization:'Bearer '+employeeToken},body:{password:newPassword}},changed);assert.equal(changed.code,200,JSON.stringify(changed.body));
 own=await ok(employee.rpc('get_staff_login_context'));assert.equal(own.staff.must_change_password,false);assert.ok(own.staff.permission_codes.includes('customer.read'));
 employeeToken=(await ok(employee.auth.signInWithPassword({email:request.email,password:newPassword}))).session.access_token;
 await ok(employee.auth.updateUser({data:{role:'ADMIN',system_role:'ADMIN',permissions:['all']}}));
 const denied=await invoke('toggleAccountStatus',{requestId:uuid(),staffId:context.id,expectedUpdatedAt:context.updated_at,action:'lock'},employeeToken);assert.equal(denied.code,403);
 assert.ok((await employee.from('staff_permission').insert({staff_id:request.staffId,permission_code:'staff.write'})).error);
 assert.ok((await admin.from('staff').update({auth_user_id:uuid()}).eq('id',request.staffId)).error);
 assert.equal((await admin.from('staff').update({id:request.staffId}).eq('id',request.staffId)).error?.message,'staff_profile_rpc_required');
 const resetPassword='Reset-'+uuid(),reset=await action('resetPassword',{password:resetPassword});assert.equal((await invoke('resetPassword',reset,token)).code,200);
 assert.equal((await ok(service.from('staff').select('must_change_password').eq('id',request.staffId).single())).must_change_password,true);
 assert.ok((await employee.auth.signInWithPassword({email:request.email,password:newPassword})).error);
 await ok(employee.auth.signInWithPassword({email:request.email,password:resetPassword}));
 await action('toggleAccountStatus',{action:'lock'});assert.ok((await employee.auth.signInWithPassword({email:request.email,password:resetPassword})).error);
 // Replaying completed provisioning must not undo a later lock.
 assert.equal((await invoke('provisionAccount',request,token)).code,200);assert.ok(Date.parse((await ok(service.auth.admin.getUserById(person.auth_user_id))).user.banned_until)>Date.now());
 const users=(await ok(service.auth.admin.listUsers({perPage:200}))).users;for(const old of before)assert.equal(users.find(u=>u.id===old.id)?.banned_until,old.banned_until);
 const audits=await ok(service.from('audit_log').select('description').in('action',['STAFF_PROFILE_CREATE','STAFF_PROVISION_DONE','STAFF_AUTH_PENDING','STAFF_AUTH_DONE','STAFF_AUTH_FAILED']));assert.equal(audits.some(a=>[request.password,newPassword,resetPassword].some(p=>a.description.includes(p))),false);
 console.log('PASS isolated real Auth provision/retry, existing-email protection, mandatory password change, no JWT-metadata privilege escalation, ACLs, reset/ban, replay safety, original accounts unchanged and no password in audit');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
