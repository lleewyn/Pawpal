// Read-only source-drift check. Does not apply the migration or execute business RPCs.
const fs=require('node:fs'),{connect}=require('./service_import_connection.cjs');
const migration=fs.readFileSync('scripts/database/v1/165_admin_fixed_roles.sql','utf8');
const block=migration.split('-- BEGIN reviewed function fingerprints')[1].split('-- END reviewed function fingerprints')[0];
const expected=[...block.matchAll(/\('([^']+)','([a-f0-9]{32})'\)/g)].map(m=>({signature:m[1],fingerprint:m[2]}));
if(expected.length<30)throw Error('Missing reviewed fingerprints');
(async()=>{let db;try{
 db=await connect();await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='10s'");
 const actual=(await db.query('SELECT s.signature,md5(pg_get_functiondef(to_regprocedure(s.signature))) fingerprint FROM unnest($1::text[]) s(signature)',[expected.map(e=>e.signature)])).rows;
 const roles=(await db.query('SELECT code,role_name FROM public.access_role ORDER BY code')).rows;
 await db.query('ROLLBACK');
 const mismatches=expected.filter(e=>!actual.some(a=>a.signature===e.signature&&a.fingerprint===e.fingerprint)).map(e=>e.signature);
 const report={capturedAt:new Date().toISOString(),scope:'Cloud READ ONLY metadata; no migration or business writes',functionsChecked:expected.length,mismatches,roles,status:mismatches.length?'SOURCE_CHANGED':'PASS'};
 fs.writeFileSync('docs/security/phase2/cloud-baseline-readonly.txt',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));if(mismatches.length)process.exitCode=1;
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error('Cloud baseline read failed:',e.code||e.name);process.exitCode=1;}finally{if(db)await db.end();}})();
