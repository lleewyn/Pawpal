// Owned local clone only. Cloud connection is READ ONLY for function/schema metadata.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {connect}=require('../database/v1/service_import_connection.cjs');
const {settings}=require('../database/v1/cloud_connection.cjs');
const out='docs/security/phase2';fs.mkdirSync(out,{recursive:true});
const database='pawpal_access_'+crypto.randomBytes(6).toString('hex'),marker='pawpal-fixed-roles-'+database;
const sql=(name,input)=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',name,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024,timeout:60000}).trim();
(async()=>{let db;try{
 const source='pawpal_customers_3daa55e18acd';
 if(sql('postgres',`SELECT datname FROM pg_database WHERE datname='${source}'`)!==source)throw Error('local_source_missing');
 sql('postgres',`CREATE DATABASE ${database} TEMPLATE ${source}; COMMENT ON DATABASE ${database} IS '${marker}';`);
 const env={database,marker,createdAt:new Date().toISOString(),status:'CREATED'};
 fs.writeFileSync(out+'/local-environment.txt',JSON.stringify(env,null,2)+'\n');
 db=await connect();await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='15s'");
 const names=['create_customer_quick','update_customer_profile','save_customer_note','add_customer_pet','update_customer_pet','save_admin_pet','record_admin_pet_weight','create_admin_service_booking','create_admin_logistics_booking','update_admin_service_booking','save_admin_service_record','save_admin_service_care_log','close_admin_hotel_stay','save_admin_pickup_notification','quote_admin_sales_order','create_admin_sales_order','get_admin_sales_cashier','get_admin_service_cashier','post_admin_sales_money','post_admin_service_money','act_admin_chat','resolve_admin_chat','create_admin_complaint','create_admin_service_ticket','act_admin_complaint','get_staff_login_context','set_admin_staff_access','create_admin_staff_profile'];
 const defs=(await db.query(`SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY($1::text[]) ORDER BY p.proname`,[names])).rows;
 const columns=(await db.query(`SELECT c.table_name,c.column_name,format_type(a.atttypid,a.atttypmod) type,pg_get_expr(d.adbin,d.adrelid) default_expr
 FROM information_schema.columns c JOIN pg_namespace n ON n.nspname=c.table_schema JOIN pg_class r ON r.relnamespace=n.oid AND r.relname=c.table_name
 JOIN pg_attribute a ON a.attrelid=r.oid AND a.attname=c.column_name LEFT JOIN pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum
 WHERE c.table_schema='public' ORDER BY c.table_name,c.ordinal_position`)).rows;
 await db.query('ROLLBACK');await db.end();db=null;
 const privateDir=fs.mkdtempSync(path.join(os.tmpdir(),'pawpal-access-phase2-'));
 fs.writeFileSync(path.join(privateDir,'cloud-functions.sql'),defs.map(f=>f.definition+';').join('\n'));
 const {config,uri}=settings();
 // Password enters stdin, never argv/output. Schema-only pg_dump does not export business rows.
 const dump=execFileSync('docker',['exec','-i','supabase-db','bash','-c',
  'IFS= read -r PGPASSWORD; export PGPASSWORD; export PGSSLMODE=require PGCONNECT_TIMEOUT=15; exec pg_dump -h "$1" -p "$2" -U "$3" -d postgres --schema-only --schema=public --schema=pawpal_private --no-owner',
  '--',uri.hostname,uri.port,decodeURIComponent(uri.username)],{input:config.DESTINATION_DATABASE_PASSWORD+'\n',encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024,timeout:240000});
 fs.writeFileSync(path.join(privateDir,'cloud-schema.sql'),dump);
 if(sql(database,"SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()")!==marker)throw Error('ownership_mismatch');
 sql(database,'DROP SCHEMA public CASCADE; DROP SCHEMA pawpal_private CASCADE;');
 sql(database,dump);
 db=await connect();await db.query('BEGIN READ ONLY');
 const permissions=(await db.query('SELECT code,description FROM public.permission ORDER BY code')).rows;
 const mappings=(await db.query("SELECT role_code,permission_code FROM public.role_permission WHERE role_code='ADMIN' ORDER BY 2")).rows;
 await db.query('ROLLBACK');await db.end();db=null;
 const literal=v=>"'"+v.replaceAll("'","''")+"'";
 sql(database,"INSERT INTO public.access_role(code,role_name) VALUES('ADMIN','Quản trị viên');\n"+
  permissions.map(p=>'INSERT INTO public.permission(code,description) VALUES('+literal(p.code)+','+literal(p.description)+');').join('\n')+'\n'+
  mappings.map(p=>'INSERT INTO public.role_permission(role_code,permission_code) VALUES('+literal(p.role_code)+','+literal(p.permission_code)+');').join('\n'));
 env.status='READY';env.cloudFunctionCount=defs.length;env.cloudSchemaOnly=true;env.privateDir=privateDir;
 fs.writeFileSync(out+'/local-environment.txt',JSON.stringify(env,null,2)+'\n');
 console.log(JSON.stringify({database,status:env.status,cloudSchemaOnly:true,permissions:permissions.length}));
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error('Local setup failed',e.code||e.name);if(e.stderr)console.error(String(e.stderr).split('\n').filter(l=>/ERROR:|LINE |HINT:/.test(l)).join('\n').slice(0,1200));process.exitCode=1;}finally{if(db)await db.end();}})();
