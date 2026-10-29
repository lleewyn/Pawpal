// Remove only the task-owned test containers/database, after exact ownership checks.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(!process.argv.includes('--cleanup-local')){console.log('No changes. Pass --cleanup-local for task fixture cleanup.');process.exit(0);}
const argument=process.argv.indexOf('--evidence-dir'),out=argument<0?'docs/chatbot/stage0-2026-10-28':process.argv[argument+1];
if(!/^docs\/chatbot\/stage[01234]-[a-z0-9-]+$/.test(out))throw Error('Invalid evidence directory');
const file=out+'/local-environment.txt',env=JSON.parse(fs.readFileSync(file,'utf8'));
if(env.status==='REMOVED'){console.log('Already removed.');process.exit(0);}
if(!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database)||env.ownerMarker!=='pawpal-chatbot-g0-'+env.database.slice('pawpal_chatbot_g0_'.length))throw Error('invalid_task_identity');
const run=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:30000});
const sql=text=>run(['exec','-i','supabase-db','psql','-U','supabase_admin','-d','postgres','-X','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],text).trim();
const owner=sql(`SELECT coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${env.database}';`);if(owner!==env.ownerMarker)throw Error('database_marker_mismatch');
for(const c of env.containers){
 const actual=JSON.parse(run(['inspect',c.id]))[0];if(actual.Config.Labels?.['pawpal.stage0.owner']!==env.ownerMarker||actual.Name!=='/'+c.name||!c.name.startsWith(env.ownerMarker+'-'))throw Error('container_marker_mismatch');
}
// All identities have been verified before the first removal.
for(const c of env.containers)run(['rm','-f',c.id]);
sql(`DROP DATABASE ${env.database};`);
if(sql(`SELECT count(*) FROM pg_database WHERE datname='${env.database}';`)!=='0')throw Error('database_not_removed');
const privateDir=path.resolve(env.privateDir),tempRoot=path.resolve(os.tmpdir())+path.sep;
if(!privateDir.startsWith(tempRoot)||!path.basename(privateDir).startsWith('pawpal-chatbot-local-'))throw Error('private_path_outside_task');
for(const name of ['connection.private.txt','rest.private.env','auth.private.env','realtime.private.env']){const target=path.join(privateDir,name);if(fs.existsSync(target))fs.unlinkSync(target);}
// Nonrecursive: refuse to remove any directory containing unexpected files.
if(fs.readdirSync(privateDir).length===0)fs.rmdirSync(privateDir);
env.status='REMOVED';env.cleanedAt=new Date().toISOString();env.cleanup={ownershipVerified:true,databaseAbsent:true,containersRemoved:env.containers.length,privateCredentialFilesRemoved:true,sourceDatabaseRetained:sql(`SELECT count(*) FROM pg_database WHERE datname='${env.sourceDatabase}';`)==='1'};
if(!env.cleanup.sourceDatabaseRetained)throw Error('source_database_not_found');
fs.writeFileSync(file,JSON.stringify(env,null,2)+'\n');console.log('PASS: owned local fixtures/database/'+env.containers.length+' containers removed, source retained; Cloud untouched.');
