// Applies only the reviewed fulfillment function; no business-row updates or Logs access.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud to deploy reviewed migration 121. No connection made.');process.exit(0);}
(async()=>{
 const db=await connect();
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  const signature='public.update_admin_sales_order(uuid,uuid,timestamptz,text,jsonb)';
  const before=(await db.query('SELECT pg_get_functiondef($1::regprocedure) definition',[signature])).rows[0].definition;
  const sql=fs.readFileSync('scripts/database/v1/121_admin_sales_fulfillment_validation.sql','utf8');
  const folder='docs/verification/admin-orders-fulfillment';fs.mkdirSync(folder,{recursive:true});
  const backup=folder+'/fulfillment-before-121.sql';
  if(!fs.existsSync(backup))fs.writeFileSync(backup,before);
  await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
  const result=(await db.query(`SELECT
   strpos(pg_get_functiondef($1::regprocedure),'update_shipping')>0 AS tracking_correction,
   strpos(pg_get_functiondef($1::regprocedure),'sales_handover_required')>0 AS handover_guard,
   strpos(pg_get_functiondef($1::regprocedure),'sales_cancel_note_invalid')>0 AS note_guard,
   has_function_privilege('authenticated',$1,'EXECUTE') AS admin_rpc_available,
   NOT has_function_privilege('anon',$1,'EXECUTE') AS anonymous_blocked`,[signature])).rows[0];
  assert.ok(Object.values(result).every(v=>v===true));
  await db.query('COMMIT');
  fs.writeFileSync(folder+'/cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',migration:'121_admin_sales_fulfillment_validation.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks:result,scope:'Function replacement and existing grants only; no existing business rows changed; no Logs access'},null,2)+'\n');
  console.log('APPLIED migration 121; tracking correction, handover/notes guards and RPC permissions verified. No existing business rows changed.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
