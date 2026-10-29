// Creates only a task-owned local test database and loopback-only Auth/REST containers.
// Never reads Cloud credentials or connects to Cloud; never alters the source database.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--create-local')){console.log('No changes. Pass --create-local for isolated local setup.');process.exit(0);}
const argument=process.argv.indexOf('--evidence-dir'),out=argument<0?'docs/chatbot/stage0-2026-10-28':process.argv[argument+1];
if(!/^docs\/chatbot\/stage[01234]-[a-z0-9-]+$/.test(out))throw Error('Invalid evidence directory');
const previous=process.argv.includes('--resume-local')?JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8')):null;
if(previous?.status==='REMOVED')throw Error('Environment already cleaned; create a new task environment without --resume-local.');
const nonce=previous?.database.replace('pawpal_chatbot_g0_','')||crypto.randomBytes(6).toString('hex'),dbName='pawpal_chatbot_g0_'+nonce,tag='pawpal-chatbot-g0-'+nonce;
const privateDir=previous?.privateDir||fs.mkdtempSync(path.join(os.tmpdir(),'pawpal-chatbot-local-'));
const report=previous||{createdAt:new Date().toISOString(),sourceDatabase:'pawpal_customers_3daa55e18acd',database:dbName,ownerMarker:tag,containers:[],migrations:[],privateDir,status:'CREATING'};
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:16*1024*1024});
const sql=(db,text)=>docker(['exec','-i','supabase-db','psql','-U','supabase_admin','-d',db,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],text);
function envMap(container){return Object.fromEntries(JSON.parse(docker(['inspect',container]))[0].Config.Env.map(v=>{const p=v.indexOf('=');return [v.slice(0,p),v.slice(p+1)];}));}
function writeEnv(name,values){const file=path.join(privateDir,name);fs.writeFileSync(file,Object.entries(values).map(([k,v])=>{if(/[\r\n]/.test(v))throw Error('multiline_environment');return k+'='+v;}).join('\n')+'\n',{flag:'wx'});return file;}
const save=()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/local-environment.txt',JSON.stringify(report,null,2)+'\n');};
(async()=>{
 const dbInfo=JSON.parse(docker(['inspect','supabase-db']))[0],network=Object.keys(dbInfo.NetworkSettings.Networks)[0];if(!network)throw Error('local_network_unavailable');
 report.network=network;
 const source=sql('postgres',"SELECT datname FROM pg_database WHERE datname='pawpal_customers_3daa55e18acd';").trim();if(source!==report.sourceDatabase)throw Error('source_unavailable');
 if(!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(dbName))throw Error('invalid_database_name');
 const existing=sql('postgres',`SELECT coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${dbName}';`).trim();
 if(existing&&existing!==tag)throw Error('database_owner_mismatch');
 if(!existing)sql('postgres',`CREATE DATABASE ${dbName} TEMPLATE ${report.sourceDatabase}; COMMENT ON DATABASE ${dbName} IS '${tag}';`);report.databaseCreated=true;save();
 const migrations=['089_admin_chat_inbox_page.sql','099_admin_copilot_session_page.sql','100_admin_chat_rule_page.sql','101_admin_copilot_facts.sql','102_chat_points_context.sql','109_chat_handoff_sla.sql','124_chat_automatic_handoff.sql','125_chat_unhandled_handoff.sql','126_copilot_extended_facts.sql'];
 for(const name of migrations){if(report.migrations.some(m=>m.name===name))continue;const content=fs.readFileSync('scripts/database/v1/'+name,'utf8');report.attemptingMigration=name;save();sql(dbName,content);report.migrations.push({name,sha256:crypto.createHash('sha256').update(content).digest('hex')});save();}
 const rest=envMap('pawpal-customers-verification-3daa55e18acd'),auth=envMap('pawpal-customers-verification-3daa55e18acd-auth');
 const secret=crypto.randomBytes(48).toString('hex');
 function replaceDb(value){const u=new URL(value);u.pathname='/'+dbName;return u.toString();}
 rest.PGRST_DB_URI=replaceDb(rest.PGRST_DB_URI);rest.PGRST_JWT_SECRET=secret;rest.PGRST_SERVER_PORT='3000';
 auth.GOTRUE_DB_DATABASE_URL=replaceDb(auth.GOTRUE_DB_DATABASE_URL);delete auth.GOTRUE_JWT_KEYS;auth.GOTRUE_JWT_SECRET=secret;auth.API_EXTERNAL_URL='http://127.0.0.1:19991';auth.GOTRUE_SITE_URL='http://127.0.0.1:18080';auth.GOTRUE_API_HOST='0.0.0.0';auth.GOTRUE_API_PORT='9999';auth.GOTRUE_DISABLE_SIGNUP='false';
 const config={database:dbName,ownerMarker:tag,jwtSecret:secret,api:'http://127.0.0.1:18080',auth:'http://127.0.0.1:19991',rest:'http://127.0.0.1:18011',privateDir};
 fs.writeFileSync(path.join(privateDir,'connection.private.txt'),JSON.stringify(config),{flag:'wx'});
 for(const spec of [{kind:'rest',image:'postgrest/postgrest:v14.18',port:'127.0.0.1:18011:3000',env:rest},{kind:'auth',image:'supabase/gotrue:v2.197.0',port:'127.0.0.1:19991:9999',env:auth}]){
  const name=tag+'-'+spec.kind,file=writeEnv(spec.kind+'.private.env',spec.env);
  const id=docker(['run','-d','--pull=never','--name',name,'--label','pawpal.stage0.owner='+tag,'--network',network,'-p',spec.port,'--env-file',file,spec.image]).trim();report.containers.push({name,id,kind:spec.kind});save();
 }
 let healthy=false;for(let i=0;i<40;i++){
  try{const a=await fetch(config.auth+'/health',{signal:AbortSignal.timeout(1000)}),r=await fetch(config.rest+'/',{signal:AbortSignal.timeout(1000)});await a.arrayBuffer();await r.arrayBuffer();if(a.ok&&r.ok){healthy=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 report.status=healthy?'READY':'NOT_READY';save();console.log(JSON.stringify({status:report.status,database:dbName,containers:report.containers.map(c=>c.name),migrationCount:report.migrations.length}));if(!healthy)process.exitCode=1;
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null,diagnostic:String(e.stderr||e.message).split('\n').find(line=>/ERROR:|source_unavailable|owner_mismatch/.test(line))?.slice(0,240)||'local_setup_error'};save();console.error('Local setup incomplete; private values suppressed.');process.exitCode=1;});
