// Bounded Cloud metadata/aggregate inspection. Never reads Supabase Logs or returns media URLs.
const fs = require('node:fs');
const path = require('node:path');
const { connect } = require('../database/v1/service_import_connection.cjs');
const tables = ['product_media','product_variant_media','service_image','care_log_media',
 'return_request_evidence','review_media','support_ticket_message_attachment','pet_profile',
 'banner','blog_post','support_ticket_message','appointment_record','appointment','appointment_adjustment'];
const folder = path.resolve('docs/media');
async function main() {
 let db;
 try {
  db = await connect();
  await db.query('BEGIN READ ONLY');
  await db.query("SET LOCAL statement_timeout='10s'");
  const columns = (await db.query(`SELECT table_name,column_name,data_type,is_nullable,column_default
   FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1)
   ORDER BY table_name,ordinal_position`, [tables])).rows;
  const constraints = (await db.query(`SELECT c.relname AS table_name,con.conname,pg_get_constraintdef(con.oid) AS definition
   FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=ANY($1) ORDER BY c.relname,con.conname`,[tables])).rows;
  const policies = (await db.query(`SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
   WHERE schemaname='public' AND tablename=ANY($1) ORDER BY tablename,policyname`,[tables])).rows;
  const functions = (await db.query(`SELECT p.oid::regprocedure::text AS signature,pg_get_functiondef(p.oid) AS definition
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
   AND (p.proname=ANY($1) OR p.proname LIKE '%care_log%' OR p.proname LIKE '%intake%' OR p.proname LIKE '%completion%')
   ORDER BY p.proname LIMIT 45`,[['request_own_sales_return','admin_save_product','admin_save_service','admin_settings_save',
   'get_guest_service_timeline','get_staff_login_context','staff_can_read_customer','staff_can_access_appointment',
   'save_admin_service_record','change_admin_service_charge','save_own_pet','act_admin_chat',
   'save_admin_sales_product','save_admin_settings_record']])).rows;
  const rls=(await db.query(`SELECT c.relname AS table_name,c.relrowsecurity,c.relforcerowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1)
   ORDER BY c.relname`,[tables])).rows;
  const counts=[];
  for (const col of columns.filter(c=>['image_url','media_url','file_url','avatar_url','thumbnail_url'].includes(c.column_name))) {
   // Identifiers are restricted to the fixed table/column inventories above.
   const t='public."'+col.table_name+'"', c='"'+col.column_name+'"';
   const row=(await db.query(`SELECT count(*)::int AS total,
    count(*) FILTER(WHERE ${c} IS NULL OR btrim(${c})='')::int AS empty,
    count(*) FILTER(WHERE ${c} ~ '^https://')::int AS https,
    count(*) FILTER(WHERE ${c} ~ '^http://')::int AS http,
    count(*) FILTER(WHERE ${c} ~ '^/?assets/')::int AS assets,
    count(*) FILTER(WHERE ${c} ~ '^(data:|blob:)')::int AS temporary,
    count(*) FILTER(WHERE ${c} ~ '^data:')::int AS data_uri,
    count(*) FILTER(WHERE ${c} ~ '^blob:')::int AS blob_uri,
    count(*) FILTER(WHERE ${c} IS NOT NULL AND btrim(${c})<>'' AND ${c} !~ '^(https?://|/?assets/|data:|blob:)')::int AS other
    FROM ${t}`)).rows[0];
   counts.push({table:col.table_name,column:col.column_name,...row});
  }
  const buckets=(await db.query('SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id LIMIT 20')).rows;
  await db.query('ROLLBACK');
  const report={capturedAt:new Date().toISOString(),scope:'Cloud READ ONLY: bounded metadata and aggregate counts; no user rows, URLs, secrets or Supabase Logs',
   requestedTables:tables,missingTables:tables.filter(t=>!columns.some(c=>c.table_name===t)),columns,constraints,policies,rls,functions,counts,buckets};
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'phase1-cloud-readonly.txt'),JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({status:'PASS',columns:columns.length,policies:policies.length,functions:functions.length,counts,bucketCount:buckets.length,missingTables:report.missingTables}));
 } catch(e) {
  if(db)await db.query('ROLLBACK').catch(()=>{});
  console.error('Media Cloud inspection failed:',e.code||e.name);
  process.exitCode=1;
 } finally {if(db)await db.end();}
}
main();
