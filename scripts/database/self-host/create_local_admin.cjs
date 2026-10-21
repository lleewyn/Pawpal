const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const envPath=process.argv[2];
if(!envPath||!path.isAbsolute(envPath))throw Error('Pass absolute self-host .env path');
const env=require('dotenv').parse(fs.readFileSync(envPath));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local only');
const out=path.join(path.dirname(envPath),'PAWPAL-ADMIN.private.txt');
if(fs.existsSync(out))throw Error('Admin credential file already exists; inspect before provisioning');
const client=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
(async()=>{
 const email='admin.local@pawpal.test';const password=crypto.randomBytes(24).toString('base64url');
 const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;
 const {error:insertError}=await client.from('staff').insert({auth_user_id:data.user.id,email,full_name:'Quản trị Pawpal local',system_role:'ADMIN',account_status:'ACTIVE',must_change_password:false});
 if(insertError){await client.auth.admin.deleteUser(data.user.id);throw insertError;}
 fs.writeFileSync(out,['Pawpal local Admin (separate from Studio)','URL: http://localhost:3001/admin/login','Email: '+email,'Password: '+password,'Scope: customers/pets milestone; other modules are not ready.'].join('\n'),{flag:'wx'});
 console.log('Local Admin provisioned. Credentials saved outside web root.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
