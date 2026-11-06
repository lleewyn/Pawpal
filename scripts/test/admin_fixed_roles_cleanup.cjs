// Removes only unused local clones created by this task; retains the current review database.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const env=JSON.parse(fs.readFileSync('docs/security/phase2/local-environment.txt','utf8'));
const sql=input=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
const rows=JSON.parse(sql("SELECT coalesce(jsonb_agg(t),'[]'::jsonb) FROM (SELECT datname,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname LIKE 'pawpal_access_%') t"));
const removed=[];
for(const row of rows){
 if(row.datname===env.database||!/^pawpal_access_[a-f0-9]{12}$/.test(row.datname)||row.marker!=='pawpal-fixed-roles-'+row.datname)continue;
 assert.notEqual(row.datname,'pawpal_customers_3daa55e18acd');sql('DROP DATABASE '+row.datname+';');removed.push(row.datname);
}
fs.writeFileSync('docs/security/phase2/cleanup.txt',JSON.stringify({capturedAt:new Date().toISOString(),removed,retained:env.database,scope:'Only exact task-owned local clone names and owner markers matched; source and Cloud untouched'},null,2)+'\n');
console.log('Removed unused owned clones: '+removed.length+'; retained current review database.');
