const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for reviewed migration 110. No network.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/110_customer_event_notifications.sql','utf8');await db.query("SET statement_timeout='8s';SET lock_timeout='3s'");await db.query(sql);
 const result=(await db.query(`SELECT
 (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgname IN('customer_support_reply_notification','customer_support_state_notification','customer_service_review_notification')) triggers,
 EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='notification_source_event_unique') AS source_index,
 NOT has_function_privilege('authenticated','pawpal_private.notify_customer_support_reply()','EXECUTE') AND
 NOT has_function_privilege('authenticated','pawpal_private.notify_customer_support_state()','EXECUTE') AND
 NOT has_function_privilege('authenticated','pawpal_private.notify_customer_service_review()','EXECUTE') AS private_helpers`)).rows[0];
 assert.deepEqual(result,{triggers:3,source_index:true,private_helpers:true});
 fs.writeFileSync('docs/verification/sync/customer-event-notifications-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),environment:'Supabase Cloud cpzuvaplseielhgcnqrn',migration:'110_customer_event_notifications.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),status:'APPLIED',checks:result,scope:'Additive source_event key/index and three future-event triggers; no backfill, old notifications, ticket/review content edits, public grants or Storage changes'},null,2)+'\n');console.log('APPLIED migration 110; three triggers, dedup index and private permissions verified.');
}catch(error){await db.query('ROLLBACK').catch(()=>{});console.error(error.code||'',error.message);process.exitCode=1;}finally{await db.end();}})().catch(error=>{console.error(error.code||'connection_failed');process.exitCode=1;});
