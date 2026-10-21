// A disposable restored database/API is used for ledger tests; never erase posted live rows.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');const {verify}=require('./verify.cjs');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',stateFile=infra+'/customer-completion.private.txt';
function docker(args){return execFileSync('docker',args,{encoding:'utf8',maxBuffer:16*1024*1024});}
function sql(db,q){return docker(['exec','supabase-db','psql','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-At','-c',q]).trim();}
const action=process.argv[2];
if(action==='prepare'){
 if(fs.existsSync(stateFile))throw Error('An existing completion verification environment must be inspected first');
 const suffix=crypto.randomBytes(6).toString('hex'),stage='pawpal_customers_'+suffix;
 const folder=infra+'/backups/customers-complete-'+suffix;fs.mkdirSync(folder,{recursive:true});verify(sql,'postgres');
 const state={stage,folder,api:'pawpal-customers-verification-'+suffix};fs.writeFileSync(stateFile,JSON.stringify(state));
 docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f','/tmp/'+stage+'.dump']);
 docker(['cp','supabase-db:/tmp/'+stage+'.dump',folder+'/before-customers-full.dump']);
 docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',stage]);
 docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',stage,'/tmp/'+stage+'.dump']);
 const env=require('dotenv').parse(fs.readFileSync(infra+'/.env'));
 const meta=JSON.parse(docker(['inspect','supabase-rest']))[0];
 const network=Object.keys(meta.NetworkSettings.Networks)[0];
 const config=[`PGRST_DB_URI=postgres://authenticator:${encodeURIComponent(env.POSTGRES_PASSWORD)}@supabase-db:5432/${stage}`,
 'PGRST_DB_SCHEMAS=public','PGRST_DB_ANON_ROLE=anon',meta.Config.Env.find(v=>v.startsWith('PGRST_JWT_SECRET=')) || `PGRST_JWT_SECRET=${env.JWT_SECRET}`,'PGRST_DB_EXTRA_SEARCH_PATH=public,extensions','PGRST_SERVER_PORT=3000'];
 const envFile=folder+'/verification-api.private.env';fs.writeFileSync(envFile,config.join('\n')+'\n');
 docker(['run','-d','--name',state.api,'--network',network,'-p','127.0.0.1:8011:3000','--env-file',envFile,meta.Config.Image]);
 console.log('Prepared restored customer verification database/API. Backup: '+folder);
}else{
 const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
 if(!/^pawpal_customers_[a-f0-9]{12}$/.test(state.stage))throw Error('Invalid verification target');
 if(action==='apply'){
  const file=process.argv[3];if(!/^0(08|09|10|11|12|13|14|15|16|17|18)_[a-z_]+\.sql$/.test(file))throw Error('Expected reviewed V1 completion migration');
  const remote='/tmp/'+state.stage+'-'+file;docker(['cp',path.join(__dirname,file),'supabase-db:'+remote]);
  for(const db of [state.stage,'postgres']){docker(['exec','supabase-db','psql','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-f',remote]);verify(sql,db);}
  console.log('PASS applied and verified '+file+' on restored and live local V1');
 }else if(action==='finish'){
  verify(sql,'postgres');
  const functions="SELECT md5(string_agg(pg_get_functiondef(p.oid),chr(10) ORDER BY p.proname)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('set_customer_status','save_customer_note','adjust_customer_points','add_customer_pet','update_customer_pet','remove_customer_pet','save_admin_pet','record_admin_pet_weight','record_pet_contact','create_admin_service_booking','update_admin_service_booking','reply_admin_service_review','save_admin_service_catalog','save_admin_service_record','save_admin_service_care_log','change_admin_service_charge','create_admin_logistics_booking','close_admin_hotel_stay','save_admin_pickup_notification','get_admin_service_cashier','post_admin_service_money','update_admin_service_booking','create_admin_service_ticket')";
  if(sql('postgres',functions)!==sql(state.stage,functions))throw Error('Live customer RPC definitions differ from the tested database');
  const logisticsTrigger="SELECT md5(string_agg(pg_get_functiondef(p.oid),chr(10) ORDER BY p.proname)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='pawpal_private' AND p.proname IN ('sync_service_logistics','guard_service_staff_availability')";
  if(sql('postgres',logisticsTrigger)!==sql(state.stage,logisticsTrigger))throw Error('Live logistics trigger differs from the tested database');
  docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f','/tmp/'+state.stage+'-after.dump']);
  const afterFile=state.folder+'/after-customers-full.dump';docker(['cp','supabase-db:/tmp/'+state.stage+'-after.dump',afterFile]);
  fs.writeFileSync(state.folder+'/after-SHA256.txt',crypto.createHash('sha256').update(fs.readFileSync(afterFile)).digest('hex')+'  after-customers-full.dump\n');
  docker(['rm','-f',state.api]);docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',state.stage]);
  fs.writeFileSync(state.folder+'/verification.txt','Customer completion migrations and browser/API tests passed. Disposable database and API removed. Live schema verified.\n');
  fs.unlinkSync(stateFile);console.log('PASS disposable verification API/database removed; backup retained: '+state.folder);
 }else throw Error('Expected prepare/apply/finish');
}
