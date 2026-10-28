// Task-owned Realtime service. Clears tenant config only in the isolated clone.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--local-only')){console.log('No changes. Use --local-only.');process.exit(0);}
const out='docs/chatbot/stage1-acceptance-2026-10-28',file=out+'/local-environment.txt',env=JSON.parse(fs.readFileSync(file,'utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('invalid_fixture');
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:30000});
const sql=text=>docker(['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],text).trim();
if(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();")!==env.ownerMarker)throw Error('owner_mismatch');
const cfg=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));
const values=Object.fromEntries(JSON.parse(docker(['inspect','realtime-dev.supabase-realtime']))[0].Config.Env.map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));
values.DB_NAME=env.database;values.DB_HOST='supabase-db';values.DB_PORT='5432';values.DB_USER='supabase_admin';values.API_JWT_SECRET=cfg.jwtSecret;values.METRICS_JWT_SECRET=cfg.jwtSecret;values.SEED_SELF_HOST='true';values.RUN_JANITOR='false';values.PORT='4000';values.DB_AFTER_CONNECT_QUERY='SET search_path TO _realtime';delete values.API_JWT_JWKS;
sql("DELETE FROM _realtime.extensions; DELETE FROM _realtime.tenants; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF; END $$;");
const envFile=path.join(env.privateDir,'realtime.private.env');fs.writeFileSync(envFile,Object.entries(values).map(([k,v])=>{if(/[\r\n]/.test(v))throw Error('invalid_multiline_env');return k+'='+v;}).join('\n')+'\n');
const name=env.ownerMarker+'-realtime',id=docker(['run','-d','--pull=never','--name',name,'--label','pawpal.stage0.owner='+env.ownerMarker,'--network',env.network,'-p','127.0.0.1:18012:4000','--env-file',envFile,'supabase/realtime:v2.143.3']).trim();
env.containers.push({name,id,kind:'realtime'});fs.writeFileSync(file,JSON.stringify(env,null,2)+'\n');console.log('Created fixture Realtime container on loopback; no Cloud or source DB changes.');
