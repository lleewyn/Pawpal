// Metadata only, scoped to the new member read projections. No business records or Cloud Logs.
const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const tables=['customer','appointment','appointment_item','sales_order','pet_profile','pet_breed','pet_species','pet_weight_history','paw_point_transaction','customer_membership','membership_tier','payment','refund_transaction'];
 const columns=(await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1) ORDER BY table_name,ordinal_position",[tables])).rows;
 const indexes=(await db.query('SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=$1 AND tablename=ANY($2) ORDER BY tablename,indexname',['public',tables])).rows;
 const views=(await db.query("SELECT relname,reloptions FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relname=ANY($1)",[['sales_order_totals','appointment_totals','customer_point_balance']])).rows;
 const report={scope:'Read-only schema/index metadata; no private records or Logs',columns,indexes,views};fs.mkdirSync('docs/chatbot/member-phase1-2026-10-31',{recursive:true});fs.writeFileSync('docs/chatbot/member-phase1-2026-10-31/source-inventory.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({tables:tables.length,columns:columns.length,indexes:indexes.length,views}));
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
